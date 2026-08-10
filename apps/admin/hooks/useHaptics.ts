"use client";

import { useCallback } from 'react';

/**
 * Hook para gerenciar micro-interações táteis (vibração).
 * Fallback inteligente para a API nativa do navegador (Navigator.vibrate)
 * garantindo funcionamento no PWA e Android.
 */
export function useHaptics() {
  const isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

  // Impacto leve (como um clique suave)
  const impactLight = useCallback(() => {
    if (isSupported) {
      try {
        navigator.vibrate(30); // 30ms para um toque sutil
      } catch (e) {
        // Ignora erros silenciados pelo navegador
      }
    }
  }, [isSupported]);

  // Impacto médio (como um botão de confirmação)
  const impactMedium = useCallback(() => {
    if (isSupported) {
      try {
        navigator.vibrate(60); 
      } catch (e) {}
    }
  }, [isSupported]);

  // Impacto forte (sucesso, alertas críticos)
  const impactHeavy = useCallback(() => {
    if (isSupported) {
      try {
        navigator.vibrate([100, 50, 100]); // Padrão duplo
      } catch (e) {}
    }
  }, [isSupported]);

  return {
    impactLight,
    impactMedium,
    impactHeavy
  };
}
