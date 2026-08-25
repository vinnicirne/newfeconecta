import { MusicTrack } from './MusicTrack';

export interface MusicPlaylist {
  id: string;
  userId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  tracks?: MusicTrack[];
  trackCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrackRow {
  id: string;
  playlist_id: string;
  track_id: string;
  track_data: MusicTrack;
  position: number;
  added_at: string;
}
