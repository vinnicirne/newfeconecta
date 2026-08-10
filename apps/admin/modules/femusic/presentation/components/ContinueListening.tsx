'use client';

import React from 'react';
import { useContinueListening } from '../../application/useContinueListening';
import { PlayCircle, X, Music } from 'lucide-react';

export default function ContinueListening() {
  const { session, resumeSession, dismissSession } = useContinueListening();

  if (!session) return null;

  const currentTrack =
    session.tracks.find((t) => t.id === session.currentTrackId || t.providerTrackId === session.currentTrackId) ||
    session.tracks[0];

  return (
    <section className="mt-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg text-white flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-whatsapp-teal" />
          Continuar ouvindo
        </h2>
        <button
          onClick={dismissSession}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
        >
          <X className="w-3.5 h-3.5" />
          Remover
        </button>
      </div>

      <button
        onClick={resumeSession}
        className="w-full flex items-center gap-4 p-3.5 rounded-2xl bg-gradient-to-r from-zinc-800/90 to-zinc-900/90 hover:from-zinc-800 hover:to-zinc-800 border border-white/10 active:scale-[0.98] transition-all text-left shadow-lg group relative overflow-hidden"
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 bg-zinc-700 flex items-center justify-center shadow-md">
          {currentTrack?.cover ? (
            <img
              src={currentTrack.cover}
              alt={session.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Music className="w-6 h-6 text-zinc-400" />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <PlayCircle className="w-8 h-8 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{session.emoji || '🎧'}</span>
            <p className="font-bold text-sm text-white truncate">{session.title}</p>
          </div>
          <p className="text-xs text-whatsapp-teal font-medium truncate mt-0.5">
            ▶ {currentTrack?.title || 'Última música ouvida'}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
            <span>{session.tracks.length} músicas na fila</span>
            {session.progress > 0 && (
              <span className="bg-white/10 px-1.5 py-0.2 rounded text-[10px]">
                {Math.floor(session.progress / 60000)}m{(Math.floor(session.progress / 1000) % 60).toString().padStart(2, '0')}s
              </span>
            )}
          </p>
        </div>
      </button>
    </section>
  );
}
