import { MusicTrack } from './MusicTrack';

export interface MusicPost {
  id: string;
  userId: string;
  trackId: string;
  track?: MusicTrack; // Expanded relation via Supabase select
  message?: string | null;
  visibility: 'public' | 'church' | 'cell' | 'private' | string;
  churchId?: string | null;
  cellId?: string | null;
  createdAt: string;
  
  // Informações do usuário resolvidas no Feed
  user?: {
    fullName: string;
    avatarUrl?: string | null;
  };
}
