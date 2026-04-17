import { supabase } from './supabase';

export type ErrorModule = 'camera' | 'gallery' | 'audio' | 'story' | 'feed' | 'system' | 'auth' | 'database';

export class ErrorMonitor {
  static async log(
    module: ErrorModule,
    error: any,
    metadata?: Record<string, any>
  ) {
    try {
      console.error(`[ErrorMonitor:${module}] Error Captured:`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stackTrace = error instanceof Error ? error.stack : null;
      
      // Attempt to get current user gracefully, fail safe if disconnected
      let userId = null;
      try {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch (e) {
        // Ignore auth error during logging
      }

      // Safe metadata serialization
      const safeMetadata = metadata ? JSON.parse(JSON.stringify(metadata, Object.getOwnPropertyNames(metadata))) : {};

      // Persistência real no banco de dados para auditoria administrativa
      const { error: insertError } = await supabase.from('system_errors').insert({
        module,
        error_message: errorMessage,
        stack_trace: stackTrace,
        user_id: userId,
        metadata: safeMetadata,
        resolved: false,
      });

      if (insertError) {
        // Silenciar aviso se a tabela não existir ou falhar por rede instável
        if (insertError.code !== 'PGRST204' && insertError.code !== 'PGRST205') {
          console.warn('ErrorMonitor failed to persist to database:', insertError);
        }
      }
    } catch (e) {
      console.error("Critical failure inside ErrorMonitor:", e);
    }
  }

  static initGlobalListeners() {
    if (typeof window !== 'undefined') {
      // Prevents multiple initializations
      if ((window as any).__ErrorMonitorInitialized) return;
      (window as any).__ErrorMonitorInitialized = true;

      window.addEventListener('error', (event) => {
        // Ignorar erros de ResizeObserver que são inofensivos e poluem o log
        if (event.message?.includes('ResizeObserver')) return;
        
        this.log('system', event.error || new Error(event.message), {
          source: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const errObj = event.reason;
        const errMsg = String(errObj?.message || errObj);
        
        // Silenciar erros internos do Supabase GoTrue (lock collision)
        if (errMsg.includes('Lock broken') || errMsg.includes('steal') || errMsg.includes('stole')) {
          event.preventDefault();
          return;
        }

        this.log('system', errObj || new Error('Unhandled Promise Rejection'), {
          type: 'unhandledrejection'
        });
      });

      console.log('🛡️ Error Monitor Listeners Initialized');
    }
  }
}
