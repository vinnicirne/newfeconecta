export interface MusicTrack {
  id: string;
  provider: 'spotify' | 'youtube' | 'deezer' | string;
  providerTrackId: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: number | null; // em milissegundos
  cover?: string | null;
  previewUrl?: string | null;
  createdAt: string;
}
