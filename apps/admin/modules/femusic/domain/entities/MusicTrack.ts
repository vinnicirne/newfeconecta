export interface MusicTrack {
  id: string;
  provider: 'spotify' | 'youtube' | 'deezer' | string;
  providerTrackId: string;
  title: string;
  artist: string;
  album?: string | null;
  duration?: number | null; // em segundos ou milissegundos
  cover?: string | null;
  previewUrl?: string | null;
  audioUrl?: string | null;
  createdAt?: string | null;
}
