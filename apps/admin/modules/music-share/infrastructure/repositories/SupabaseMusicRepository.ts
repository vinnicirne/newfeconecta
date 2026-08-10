import { CreateMusicPostDTO, IMusicRepository } from '../../domain/repositories/IMusicRepository';
import { MusicPost } from '../../domain/entities/MusicPost';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseMusicRepository implements IMusicRepository {
  constructor(private supabase: SupabaseClient) {}

  async createPost(data: CreateMusicPostDTO): Promise<MusicPost> {
    const { data: result, error } = await this.supabase
      .from('music_posts')
      .insert([
        {
          user_id: data.userId,
          church_id: data.churchId,
          cell_id: data.cellId,
          ministry_id: data.ministryId,
          platform: data.platform,
          type: data.type,
          external_id: data.externalId,
          title: data.title,
          artist: data.artist,
          album: data.album,
          cover: data.cover,
          duration: data.duration,
          url: data.url,
          reflection: data.reflection,
          verse: data.verse,
          visibility: data.visibility
        }
      ])
      .select('*, user:profiles(full_name, avatar_url)')
      .single();

    if (error) throw new Error('Erro ao salvar post: ' + error.message);

    return this.mapToEntity(result);
  }

  async getFeed(params: { limit?: number; offset?: number; churchId?: string; filter?: 'all' | 'worship' | 'playlist' | 'podcast' }): Promise<MusicPost[]> {
    let query = this.supabase
      .from('music_posts')
      .select('*, user:profiles(full_name, avatar_url), reactions:music_reactions(count), comments:music_comments(count)')
      .order('created_at', { ascending: false });

    if (params.limit) query = query.limit(params.limit);
    
    // Filtros futuros podem ser adicionados aqui

    const { data, error } = await query;
    if (error) throw new Error('Erro ao buscar feed: ' + error.message);

    return (data || []).map(row => ({
      ...this.mapToEntity(row),
      reactionsCount: row.reactions?.[0]?.count || 0,
      commentsCount: row.comments?.[0]?.count || 0,
    }));
  }

  async likePost(postId: string, userId: string, reaction: string): Promise<void> {
    const { error } = await this.supabase
      .from('music_reactions')
      .insert([{ post_id: postId, user_id: userId, reaction }]);
    if (error && error.code !== '23505') throw new Error(error.message); // ignora unique violation
  }

  async unlikePost(postId: string, userId: string, reaction: string): Promise<void> {
    const { error } = await this.supabase
      .from('music_reactions')
      .delete()
      .match({ post_id: postId, user_id: userId, reaction });
    if (error) throw new Error(error.message);
  }

  async commentPost(postId: string, userId: string, message: string, parentId?: string): Promise<void> {
    const { error } = await this.supabase
      .from('music_comments')
      .insert([{ post_id: postId, user_id: userId, message, parent_id: parentId }]);
    if (error) throw new Error(error.message);
  }

  async savePost(postId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('music_saved')
      .insert([{ post_id: postId, user_id: userId }]);
    if (error && error.code !== '23505') throw new Error(error.message);
  }

  private mapToEntity(row: any): MusicPost {
    return {
      id: row.id,
      userId: row.user_id,
      churchId: row.church_id,
      cellId: row.cell_id,
      ministryId: row.ministry_id,
      platform: row.platform,
      type: row.type,
      externalId: row.external_id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      cover: row.cover,
      duration: row.duration,
      url: row.url,
      reflection: row.reflection,
      verse: row.verse,
      visibility: row.visibility,
      createdAt: row.created_at,
      user: row.user ? {
        name: row.user.full_name,
        avatarUrl: row.user.avatar_url
      } : undefined
    };
  }
}
