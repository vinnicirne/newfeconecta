'use client';

import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { READY_SESSIONS, ReadySession } from '../../domain/sessions';
import { YouTubeService } from '../../infrastructure/services/YouTubeService';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { saveContinueSession } from '../../domain/continueListening';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function ReadySessions() {
  const [sessions, setSessions] = useState<ReadySession[]>(READY_SESSIONS);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { play } = usePlayerStore();

  useEffect(() => {
    // 1. Carrega do system_configs gerenciado pelo Admin
    supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'femusic_system_config_v1')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value?.sessions && Array.isArray(data.value.sessions) && data.value.sessions.length > 0) {
          setSessions(data.value.sessions);
        }
      });
  }, []);

  const startSession = async (session: ReadySession) => {
    setLoadingId(session.id);
    const toastId = toast.loading(`Buscando louvores para "${session.title}"...`, {
      description: 'Aguarde um momento 🙏'
    });

    try {
      // Busca todas as queries em paralelo — IDs reais vindos do YouTube
      const settledResults = await Promise.allSettled(
        session.queries.map((q) => YouTubeService.search(q, 3))
      );

      const apiTracks = settledResults
        .filter((res): res is PromiseFulfilledResult<MusicTrack[]> => res.status === 'fulfilled')
        .flatMap((res) => res.value);

      // Remove duplicados pelo providerTrackId
      const uniqueTracks = Array.from(
        new Map(apiTracks.map((t) => [t.providerTrackId || t.id, t])).values()
      );

      // Embaralha
      const shuffled = uniqueTracks.sort(() => Math.random() - 0.5);

      if (shuffled.length === 0) {
        toast.dismiss(toastId);
        toast.error('Nenhum louvor encontrado. Verifique sua conexão.');
        return;
      }

      toast.dismiss(toastId);
      toast.success(`Sessão "${session.title}" com ${shuffled.length} louvores! 🙏`);
      
      saveContinueSession({
        id: session.id,
        title: session.title,
        emoji: session.emoji,
        tracks: shuffled,
        currentTrackId: shuffled[0].id,
        progress: 0,
        updatedAt: Date.now(),
      });

      await play(shuffled[0], shuffled);
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      toast.dismiss(toastId);
      toast.error('Erro ao carregar a sessão. Tente novamente.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className="mt-8 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            ✨ Sessões Prontas
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Um clique para entrar em comunhão e oração</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => startSession(session)}
            disabled={loadingId === session.id}
            className={`relative overflow-hidden rounded-2xl p-4 text-left text-white bg-gradient-to-br ${session.color || 'from-purple-600 to-indigo-700'} active:scale-95 hover:brightness-110 transition-all shadow-lg border border-white/10 flex flex-col justify-between min-h-[130px]`}
          >
            <div className="flex items-start justify-between w-full mb-2">
              <span className="text-2xl drop-shadow-md">{session.emoji}</span>
              <span className="text-[10px] font-medium bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                {session.durationLabel}
              </span>
            </div>
            
            <div>
              <h3 className="font-bold text-sm leading-tight text-white drop-shadow">{session.title}</h3>
              <p className="text-[11px] text-white/80 line-clamp-2 mt-0.5">{session.description}</p>
              <p className="text-[9px] text-white/60 font-semibold truncate mt-1.5">
                🎵 {session.queries.slice(0, 2).map(q => q.split(' ').slice(0, 2).join(' ')).join(' • ')}...
              </p>
            </div>

            {loadingId === session.id && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-semibold text-white">Preparando...</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
