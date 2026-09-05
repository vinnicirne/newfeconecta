import { create } from 'zustand';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { IMusicProvider } from '../../domain/providers/IMusicProvider';
import { YouTubeProvider } from '../providers/YouTubeProvider';

interface PlayerState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  progressMs: number;
  provider: IMusicProvider | null;
  queue: MusicTrack[];
  durationMs: number;
  isFullScreen: boolean;
  isLoading: boolean;
  isVideoVisible: boolean;
  likedTracks: MusicTrack[];
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  consecutiveFailures: number; // ← guard contra loop infinito de auto-skip
  
  // Actions
  loadLikes: () => void;
  toggleLike: (track: MusicTrack) => void;
  setProvider: (provider: IMusicProvider) => void;
  setFullScreen: (val: boolean) => void;
  play: (track: MusicTrack, newQueue?: MusicTrack[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  next: (isManual?: boolean) => Promise<void>;
  previous: (isManual?: boolean) => Promise<void>;
  seek: (ms: number) => Promise<void>;
  addToQueue: (track: MusicTrack) => void;
  updateProgress: (ms: number) => void;
  setDuration: (ms: number) => void;
  setVideoVisible: (val: boolean) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  incrementFailures: () => void;
  resetFailures: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
  provider: new YouTubeProvider(),
  queue: [],
  isFullScreen: false,
  isLoading: false,
  isVideoVisible: false,
  likedTracks: [],
  isShuffled: false,
  repeatMode: 'off',
  consecutiveFailures: 0,

  loadLikes: async () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('fc_music_likes');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            set({ likedTracks: parsed });
          }
        }
        
        // Sincroniza com o Supabase se houver usuário autenticado
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('music_likes')
            .select('track_data')
            .eq('user_id', user.id);

          if (!error && data && data.length > 0) {
            const dbTracks = data.map((row: any) => row.track_data).filter(Boolean);
            if (dbTracks.length > 0) {
              set({ likedTracks: dbTracks });
              localStorage.setItem('fc_music_likes', JSON.stringify(dbTracks));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load likes", e);
      }
    }
  },

  toggleLike: async (track) => {
    if (!track) return;
    const trackId = track.providerTrackId || track.id;
    if (!trackId) return;

    const { likedTracks } = get();
    const isLiked = likedTracks.some(
      (t) => (t.providerTrackId || t.id) === trackId
    );

    let newLikes: MusicTrack[];
    if (isLiked) {
      newLikes = likedTracks.filter(
        (t) => (t.providerTrackId || t.id) !== trackId
      );
    } else {
      newLikes = [{ ...track, id: trackId, providerTrackId: trackId }, ...likedTracks];
    }

    set({ likedTracks: newLikes });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fc_music_likes', JSON.stringify(newLikes));

        // Toast de feedback
        const { toast } = await import('sonner');
        if (!isLiked) {
          toast.success(`"${track.title}" salva em Curtidas! ❤️`);
        } else {
          toast.info(`"${track.title}" removida das Curtidas.`);
        }

        // Grava no Supabase
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (!isLiked) {
            await supabase.from('music_likes').upsert({
              user_id: user.id,
              track_id: trackId,
              track_data: { ...track, id: trackId, providerTrackId: trackId },
              created_at: new Date().toISOString()
            }, { onConflict: 'user_id,track_id' });
          } else {
            await supabase.from('music_likes').delete().match({
              user_id: user.id,
              track_id: trackId
            });
          }
        }
      } catch (e) {
        console.error("Failed to save likes", e);
      }
    }
  },

  toggleShuffle: () => {
    const { isShuffled } = get();
    set({ isShuffled: !isShuffled });
  },

  cycleRepeat: () => {
    const { repeatMode } = get();
    const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    set({ repeatMode: next });
  },

  setProvider: (provider) => set({ provider }),
  setFullScreen: (val) => set({ isFullScreen: val, isVideoVisible: false }),
  setVideoVisible: (val) => set({ isVideoVisible: val }),

  play: async (track, newQueue) => {
    const { provider } = get();
    if (!provider) {
      console.warn("Nenhum MusicProvider configurado.");
      return;
    }
    
    if (newQueue && newQueue.length > 0) {
      // 1. Deduplica por providerTrackId
      const byId = Array.from(
        new Map(newQueue.filter(Boolean).map(t => [t.providerTrackId || t.id, t])).values()
      );

      // 2. Remove versões do mesmo louvor (títulos muito similares ao que está sendo tocado)
      const normTitle = (s: string) =>
        s.toLowerCase()
          .replace(/\(?(official\s*(video|audio|music\s*video|lyric|lyrics|clip|hd|4k)|lyric\s*video|ao vivo|live|legendado|versão|version|feat\.?|ft\.?|prod\.?|remix|cover|karaoke|playback|letra|tradução|completo|album completo|full album)\)?/gi, '')
          .replace(/[\[\]()]/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

      const trackNorm = normTitle(track.title || '');
      const seenNorms = new Set<string>();
      // Garante que a faixa selecionada entra primeiro
      seenNorms.add(trackNorm);

      const uniqueQueue = byId.filter(t => {
        const n = normTitle(t.title || '');
        if (seenNorms.has(n)) return false;
        seenNorms.add(n);
        return true;
      });

      // Reinsere a faixa atual no índice correto para manter a ordem
      const currentInQueue = byId.find(t =>
        (t.providerTrackId || t.id) === (track.providerTrackId || track.id)
      );
      const finalQueue = currentInQueue
        ? [currentInQueue, ...uniqueQueue.filter(t => (t.providerTrackId || t.id) !== (track.providerTrackId || track.id))]
        : uniqueQueue;

      set({ queue: finalQueue });
    } else {
      const { queue } = get();
      const exists = queue.some(t => t.id === track.id || (t.providerTrackId && t.providerTrackId === track.providerTrackId));
      if (!exists || queue.length === 0) {
        set({ queue: [track] });
      }
    }
    
    // Salvar no histórico local
    if (typeof window !== 'undefined') {
      try {
        const historyStr = localStorage.getItem('fc_music_history');
        let history = historyStr ? JSON.parse(historyStr) : [];
        history = history.filter((t: MusicTrack) => t.id !== track.id);
        history.unshift(track);
        if (history.length > 20) history = history.slice(0, 20);
        localStorage.setItem('fc_music_history', JSON.stringify(history));
      } catch (e) {
        console.error("Failed to save music history", e);
      }
    }

    // Reset do contador de falhas só ocorre quando a música realmente toca (no YouTubeProvider)

    // Abre o fullscreen imediatamente e mostra o estado de carregamento
    // IMPORTANTE: NÃO setar isPlaying: false aqui! Isso dispara active.pause() no usePlayerControls
    // o que cria um loop: play → set(isPlaying:false) → audio.pause() → onPause → set(isPlaying:false)
    console.log(`[PlayerStore] Iniciando PLAY: track_id=${track.id}, track_title="${track.title}"`);
    set({ currentTrack: track, isFullScreen: true, isLoading: true });

    try {
      await provider.play(track);
      // track.duration vem em SEGUNDOS do YouTubeService — converter para ms
      const durationMs = track.duration && track.duration > 0
        ? (track.duration > 3600 ? track.duration : track.duration * 1000)
        : 0;
      set({ isPlaying: true, progressMs: 0, durationMs, consecutiveFailures: 0, isLoading: false });

      // Registra a reprodução no histórico do Supabase (music_history) e atualiza o ranking
      import('../../domain/tracking').then(({ recordUserPlayback }) => {
        recordUserPlayback(track);
      }).catch(() => {});
    } catch (e) {
      console.warn("Failed to play track:", e);
      set({ currentTrack: null, isPlaying: false, isFullScreen: false, isLoading: false });
    }
  },

  pause: async () => {
    console.log('[PlayerStore] Chamando PAUSE()');
    const { provider } = get();
    if (provider) await provider.pause();
    set({ isPlaying: false });
  },

  resume: async () => {
    console.log('[PlayerStore] Chamando RESUME()');
    const { provider } = get();
    if (provider) await provider.resume();
    set({ isPlaying: true });
  },

  next: async (isManual = false) => {
    const { queue, currentTrack, play, pause, isShuffled, repeatMode } = get();
    console.log(`[PlayerStore] NEXT() chamado (isManual: ${isManual}, queue: ${queue.length})`);
    if (queue.length > 0 && currentTrack) {
      // Repeat One: reinicia a mesma faixa apenas se for automático
      if (repeatMode === 'one' && !isManual) {
        console.log('[PlayerStore] NEXT: Repeat One automático - repetindo');
        await play(currentTrack, queue);
        return;
      }

      const idx = queue.findIndex(
        t => t.id === currentTrack.id || (t.providerTrackId && t.providerTrackId === currentTrack.providerTrackId)
      );

      // Shuffle: escolhe faixa aleatória diferente da atual
      if (isShuffled && queue.length > 1) {
        let randomIdx = Math.floor(Math.random() * queue.length);
        while (randomIdx === idx) randomIdx = Math.floor(Math.random() * queue.length);
        await play(queue[randomIdx], queue);
        return;
      }

      if (idx !== -1 && idx < queue.length - 1) {
        console.log(`[PlayerStore] NEXT: Avançando para próximo índice (${idx + 1})`);
        await play(queue[idx + 1], queue);
      } else if (repeatMode === 'all' || repeatMode === 'one') {
        console.log('[PlayerStore] NEXT: Fim da fila com repeatMode - voltando ao início');
        // Se for repeat all (ou repeat one pulado manualmente no fim da fila), volta para o início
        await play(queue[0], queue);
      } else if (idx === -1 && queue.length > 0) {
        console.log('[PlayerStore] NEXT: Índice -1 com fila maior que 0 - voltando ao início');
        await play(queue[0], queue);
      } else {
        console.log('[PlayerStore] NEXT: Fim da fila sem repeat - pausando player');
        await pause();
        set({ isPlaying: false });
      }
    }
  },

  previous: async (isManual = false) => {
    const { queue, currentTrack, play, pause, progressMs, repeatMode } = get();
    console.log(`[PlayerStore] PREVIOUS() chamado (isManual: ${isManual}, progressMs: ${progressMs})`);
    // Se passou mais de 3s e é manual, reinicia a música atual
    if (progressMs > 3000 && isManual) {
      console.log('[PlayerStore] PREVIOUS: Acima de 3s - reiniciando música');
      const { seek } = get();
      await seek(0);
      return;
    }

    if (queue.length > 0 && currentTrack) {
      const idx = queue.findIndex(
        t => t.id === currentTrack.id || (t.providerTrackId && t.providerTrackId === currentTrack.providerTrackId)
      );
      if (idx > 0) {
        console.log(`[PlayerStore] PREVIOUS: Voltando para índice (${idx - 1})`);
        await play(queue[idx - 1], queue);
      } else if (idx === -1 && queue.length > 0) {
        console.log('[PlayerStore] PREVIOUS: Índice -1 com fila - tocando última');
        await play(queue[queue.length - 1], queue);
      } else if (queue.length > 1 && (repeatMode === 'all' || repeatMode === 'one')) {
        console.log('[PlayerStore] PREVIOUS: Início da fila com repeat - tocando última');
        await play(queue[queue.length - 1], queue);
      } else {
        console.log('[PlayerStore] PREVIOUS: Início da fila sem repeat - reiniciando');
        // Se é a primeira da fila e não tem repeat, reinicia ela mesma
        const { seek } = get();
        await seek(0);
        await play(currentTrack, queue);
      }
    }
  },

  seek: async (ms) => {
    const { provider } = get();
    if (provider) await provider.seek(ms);
    set({ progressMs: ms });
  },

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  
  updateProgress: (ms) => set({ progressMs: ms }),
  setDuration: (ms) => set({ durationMs: ms }),

  // Guard contra loop infinito de auto-skip
  incrementFailures: () => {
    const { consecutiveFailures, pause, next } = get();
    const nextFails = consecutiveFailures + 1;
    set({ consecutiveFailures: nextFails, isLoading: false });

    const MAX_FAILURES = 5;
    if (nextFails >= MAX_FAILURES) {
      console.warn(`[PlayerStore] ${nextFails} falhas consecutivas. Parando o player.`);
      pause();
      set({ isPlaying: false, queue: [], consecutiveFailures: 0, isLoading: false });
      import('sonner').then(({ toast }) => {
        toast.error('Playlist indisponível', {
          description: 'Todas as músicas nesta sessão estão indisponíveis no YouTube. Tente outra sessão.',
          duration: 6000,
        });
      });
    } else {
      // Pequeno delay para não criar loop síncrono de chamadas ao provider
      setTimeout(() => next(), 500);
    }
  },

  resetFailures: () => set({ consecutiveFailures: 0 }),
}));
