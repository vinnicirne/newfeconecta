"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class FeedErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Feed Post Crash:", error, errorInfo);
    
    // Telemetry: Grava falha silenciosa para monitoramento técnico (Semana 1)
    supabase.from('system_errors').insert({
      module: 'FeedErrorBoundary',
      error_message: error.message || 'Unknown Crash',
      severity: 'error',
      resolved: false,
      metadata: { 
        componentStack: errorInfo.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : 'ssr'
      }
    }).then(({ error: dbError }) => {
      if (dbError) console.error("Falha ao registrar telemetria:", dbError);
    });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="mx-4 mb-6 p-8 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-3xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Conteúdo Indisponível</h4>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Houve um erro técnico ao renderizar esta publicação.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => this.setState({ hasError: false })}
            className="rounded-full text-[10px] font-black uppercase tracking-widest border-red-200 hover:bg-red-100 dark:border-red-800"
          >
            <RefreshCw className="w-3 h-3 mr-2" /> Tentar Novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
