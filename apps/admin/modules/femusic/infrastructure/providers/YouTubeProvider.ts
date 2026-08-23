import { IMusicProvider } from '../../domain/providers/IMusicProvider';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { YouTubeService } from '../services/YouTubeService';

export class YouTubeProvider implements IMusicProvider {
  private isConnected = true;
  private isPlaying = false;
  private currentTrack: MusicTrack | null = null;
  private preloading = new Set<string>();

  private get player(): HTMLAudioElement | null {
    return (window as any).audioPlayer || null;
  }

  async connect(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.isPlaying = false;
    this.player?.pause();
  }

  async play(track: MusicTrack): Promise<void> {
    this.currentTrack = track;
    this.isPlaying = true;

    // 1. Local cache (instant)
    if (typeof window !== 'undefined') {
      const localCachedUrl = localStorage.getItem(`fc_audio_cache_${track.providerTrackId}`);
      if (localCachedUrl && this.player) {
        console.log(`[YouTubeProvider] Cache hit: ${track.title}`);
        this.player.src = localCachedUrl;
        this.player.play().catch((e) => console.error('Play failed:', e));
        return;
      }
    }

    let loadingToastId: string | number | undefined;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const { toast } = await import('sonner');

      toastTimer = setTimeout(() => {
        loadingToastId = toast.loading('Preparando audio...', {
          description: 'So na primeira vez!',
        });
      }, 350);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${track.providerTrackId}`,
          track: track
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (toastTimer) clearTimeout(toastTimer);
      if (loadingToastId) toast.dismiss(loadingToastId);

      const data = await response.json();

      if (data.url && this.player) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`fc_audio_cache_${track.providerTrackId}`, data.url);
        }

        this.player.src = data.url;
        await this.player.play().catch((e) => console.error('Play failed:', e));

        try {
          const { usePlayerStore } = await import(
            '@/modules/femusic/infrastructure/state/usePlayerStore'
          );
          usePlayerStore.getState().resetFailures();
        } catch (_) {}
      } else {
        await this.handleUnavailableTrack(track, toast, loadingToastId);
      }
    } catch (err: any) {
      if (toastTimer) clearTimeout(toastTimer);

      const { toast } = await import('sonner');
      if (loadingToastId) toast.dismiss(loadingToastId);

      const isAbort = err?.name === 'AbortError';

      if (isAbort) {
        toast.error('Tempo esgotado ao carregar a musica');
      } else {
        console.error('[YouTubeProvider] Erro:', err);
        await this.handleUnavailableTrack(track, toast);
      }
    }
  }

  private async handleUnavailableTrack(
    track: MusicTrack,
    toast: any,
    loadingToastId?: string | number
  ) {
    this.isPlaying = false;

    if (loadingToastId) toast.dismiss(loadingToastId);

    toast.warning(`"${track.title}" indisponivel`, {
      description: 'Pulando para a proxima...',
      duration: 2200,
    });

    try {
      const { usePlayerStore } = await import(
        '@/modules/femusic/infrastructure/state/usePlayerStore'
      );
      const store = usePlayerStore.getState();

      store.incrementFailures();
    } catch (_) {}
  }

  async preloadTrack(track: MusicTrack): Promise<void> {
    if (!track?.providerTrackId) return;
    if (this.preloading.has(track.providerTrackId)) return;

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`fc_audio_cache_${track.providerTrackId}`);
      if (cached) return;
    }

    this.preloading.add(track.providerTrackId);

    try {
      const response = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${track.providerTrackId}`,
          track: track
        }),
      });

      const data = await response.json();

      if (data.url && typeof window !== 'undefined') {
        localStorage.setItem(`fc_audio_cache_${track.providerTrackId}`, data.url);
        console.log(`[Preload] Ready: ${track.title}`);
      }
    } catch (err) {
      console.warn(`[Preload] Failed: ${track.title}`, err);
    } finally {
      this.preloading.delete(track.providerTrackId);
    }
  }

  preloadNextTracks(queue: MusicTrack[], currentTrackId: string | null, count = 2) {
    if (!queue.length || !currentTrackId) return;

    const currentIndex = queue.findIndex(
      (t) => t.id === currentTrackId || t.providerTrackId === currentTrackId
    );
    if (currentIndex === -1) return;

    const nextTracks = queue.slice(currentIndex + 1, currentIndex + 1 + count);
    nextTracks.forEach((track) => this.preloadTrack(track));
  }

  async pause(): Promise<void> {
    this.isPlaying = false;
    this.player?.pause();
  }

  async resume(): Promise<void> {
    this.isPlaying = true;
    this.player?.play().catch((e) => console.error('Resume failed:', e));
  }

  async next(): Promise<void> {
    // Real logic is in the store
  }

  async previous(): Promise<void> {
    // Real logic is in the store
  }

  async seek(positionMs: number): Promise<void> {
    if (this.player) {
      this.player.currentTime = positionMs / 1000;
    }
  }

  async search(query: string): Promise<MusicTrack[]> {
    return YouTubeService.search(query);
  }
}