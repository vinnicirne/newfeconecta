import { MusicPost, MusicPlatform, MusicType } from '../entities/MusicPost';

export interface CreateMusicPostDTO {
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
  duration?: number;
  url: string;
  reflection?: string;
  verse?: string;
  visibility: 'public' | 'church' | 'cell' | 'ministry';
}

export interface IMusicRepository {
  createPost(data: CreateMusicPostDTO): Promise<MusicPost>;
  getFeed(params: {
    limit?: number;
    offset?: number;
    churchId?: string;
    filter?: 'all' | 'worship' | 'playlist' | 'podcast';
  }): Promise<MusicPost[]>;
  likePost(postId: string, userId: string, reaction: string): Promise<void>;
  unlikePost(postId: string, userId: string, reaction: string): Promise<void>;
  commentPost(postId: string, userId: string, message: string, parentId?: string): Promise<void>;
  savePost(postId: string, userId: string): Promise<void>;
}
