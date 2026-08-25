'use client';

import React, { useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = ['/music', '/music/search', '/music/library'];

export default function SwipeTabContainer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef<boolean>(false);

  const currentIndex = TABS.findIndex((tab) => 
    tab === '/music' ? pathname === '/music' : pathname.startsWith(tab)
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    // Se o toque começou dentro de um elemento com scroll horizontal específico (ex: carrossel ou input), ignorar
    const target = e.target as HTMLElement;
    if (
      target.closest('.no-swipe') || 
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('.snap-x')
    ) {
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current || touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Reset flags
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;

    // Garante que é um gesto predominantemente horizontal com distância mínima (65px)
    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6) {
      if (deltaX < 0) {
        // Deslize para a Esquerda (←) -> Próxima Aba
        if (currentIndex !== -1 && currentIndex < TABS.length - 1) {
          router.push(TABS[currentIndex + 1]);
        }
      } else {
        // Deslize para a Direita (→) -> Aba Anterior
        if (currentIndex > 0) {
          router.push(TABS[currentIndex - 1]);
        }
      }
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full flex-1 touch-pan-y"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0.85, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0.85, x: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
