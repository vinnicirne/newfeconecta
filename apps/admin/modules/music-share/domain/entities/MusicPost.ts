export type MusicPlatform = 'spotify' | 'youtube' | 'deezer' | 'unknown';
export type MusicType = 'track' | 'playlist' | 'album' | 'podcast' | 'unknown';

export interface MusicPost {
  id: string;
  userId: string;
  churchId?: string;
  cellId?: string;
  ministryId?: string;
  platform: MusicPlatform;
  type: MusicType;
  externalId: string;
  title: string;
  artist?: string;
  album?: string;
  cover?: string;
  duration?: number; // em segundos
  url: string;
  reflection?: string;
  verse?: string;
  visibility: 'public' | 'church' | 'cell' | 'ministry';
  createdAt: string;
  user?: {
    name: string;
    avatarUrl?: string;
  };
  reactionsCount?: number;
  commentsCount?: number;
}
