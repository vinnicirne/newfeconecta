"use client";

import { SWRConfig } from 'swr';
import React from 'react';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 180000, // 🛡️ 3 minutos de deduplicação global
      errorRetryCount: 3,
      onErrorRetry: (error: any, key: string, config: any, revalidate: any, { retryCount }: { retryCount: number }) => {
        // Se for erro 400 (Bad Request), para de tentar na hora para poupar o Free Tier
        // Nota: O erro do Supabase pode vir no formato { code, message, status } ou apenas ser um objeto de erro
        const isBadRequest = 
          error?.status === 400 || 
          error?.message?.includes('400') || 
          error?.code === 'PGRST116' || // Code comum para 400 no PostgREST
          error?.code === '22P02';      // Invalid text representation (ex: uuid malformado)
          
        if (isBadRequest) {
          console.warn(`[SWR] Interrompendo retentativas para erro 400 (Bad Request) em: ${key}`);
          return;
        }
        
        // Limite de 3 tentativas para outros erros (ex: oscilação de rede)
        if (retryCount >= 3) return;
        
        // Retry exponencial para não sobrecarregar
        const delay = Math.pow(2, retryCount) * 1000 + 5000;
        setTimeout(() => revalidate({ retryCount }), delay);
      }
    }}>
      {children}
    </SWRConfig>
  );
}
