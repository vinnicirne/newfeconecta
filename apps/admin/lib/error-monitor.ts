import { supabase } from './supabase';
import { toast } from 'sonner';

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

      window.addEventListener('online', () => {
        toast.success("Conexão restaurada! Sincronizando sua fé...", {
          icon: '✨',
          duration: 3000
        });
      });

      window.addEventListener('offline', () => {
        toast.error("Você está offline. O FéConecta continuará funcionando com dados locais.", {
          icon: '📡',
          duration: 5000
        });
      });

      window.addEventListener('error', (event) => {
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

        // Ignorar erros de concorrência de sessão (Lock Manager)
        if (errMsg.includes('Lock broken') || errMsg.includes('steal') || errMsg.includes('stole')) {
          event.preventDefault();
          return;
        }

        // Ignorar erros de suporte de Push/Messaging (Firebase)
        if (errMsg.includes('messaging/unsupported-browser') || errMsg.includes('Messaging: This browser doesn\'t support')) {
          event.preventDefault();
          return;
        }

        // Ignorar erros de CacheStorage (comuns em modo anônimo/PWA instável)
        if (errMsg.includes('CacheStorage') || errMsg.includes('Unexpected internal error')) {
          event.preventDefault();
          return;
        }



        // Ignorar redirecionamentos nativos do Next.js (NEXT_REDIRECT) e 404 intencional
        if (errMsg.includes('NEXT_REDIRECT') || errMsg.includes('NEXT_NOT_FOUND')) {
          event.preventDefault();
          return;
        }

        // Se for erro de rede/fetch, avisar de forma amigável
        if (errMsg.toLowerCase().includes('fetch') || errMsg.toLowerCase().includes('network')) {
          toast.warning("Sinal instável. Tentando reconectar ao Reino...", {
            id: 'network-retry',
            duration: 2000
          });
        }

        this.log('system', errObj || new Error('Unhandled Promise Rejection'), {
          type: 'unhandledrejection'
        });
      });

      console.log('🛡️ Resiliência Ativa: Listeners de Rede e Erros Inicializados');
    }
  }
}


