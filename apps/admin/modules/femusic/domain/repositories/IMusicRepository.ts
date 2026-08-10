import { MusicTrack } from '../entities/MusicTrack';
import { MusicPost } from '../entities/MusicPost';

export interface IMusicRepository {
  getTrackById(id: string): Promise<MusicTrack | null>;
  saveTrack(track: Omit<MusicTrack, 'id' | 'createdAt'>): Promise<MusicTrack>;
  
  createPost(post: Omit<MusicPost, 'id' | 'createdAt' | 'track' | 'user'>): Promise<MusicPost>;
  getFeed(params: { limit?: number; offset?: number; churchId?: string; cellId?: string }): Promise<MusicPost[]>;
}
