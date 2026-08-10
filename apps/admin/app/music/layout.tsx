'use client';

import React from 'react';
import MusicTopNav from '@/modules/femusic/presentation/components/MusicTopNav';

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-black/95">
      <MusicTopNav />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
