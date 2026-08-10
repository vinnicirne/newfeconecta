import useSWRInfinite from 'swr/infinite';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type FeedPost = {
  id: string;
  content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  post_type: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  stats: {
    likes: number;
    comments: number;
    reposts: number;
    views: number;
  };
  viewer_state: {
    liked: boolean;
    saved: boolean;
    following: boolean;
  };
  feed_uid: string;
};

const PAGE_SIZE = 15;

/** Normaliza item do RPC/realtime para o shape que o PostCard espera */
function normalizeFeedPost(item: any): any {
  const author = item.author || {};
  const feedUid = item.feed_uid
    || (item.is_repost
      ? `repost-${item.id}-${item.reposter_id || 'unknown'}-${item.created_at}`
      : `post-${item.id}-${item.created_at}`);

  return {
    ...item,
    author_id: item.author_id || item.user_id || author.id,
    author_name: item.author_name || author.full_name || author.name || 'Usuário',
    author_username: item.author_username || author.username || 'usuario',
    author_avatar: item.author_avatar || author.avatar_url || author.avatar || null,
    is_verified: item.is_verified ?? author.is_verified ?? false,
    verification_label: item.verification_label || author.verification_label,
    likes: Array.isArray(item.likes) ? item.likes : [],
    likes_count: item.likes_count ?? item.stats?.likes ?? (Array.isArray(item.likes) ? item.likes.length : 0),
    comments_count: item.comments_count ?? item.stats?.comments ?? 0,
    reposts_count: item.reposts_count ?? item.stats?.reposts ?? 0,
    views_count: item.views_count ?? item.stats?.views ?? 0,
    background: item.background || null,
    feed_uid: feedUid,
    viewer_state: item.viewer_state || { liked: false, saved: false, following: false },
  };
}

export function useFeed(currentUserId: string | null, tag?: string) {
  const getKey = (pageIndex: number, previousPageData: any[] | null) => {
    if (!currentUserId) return null; // Proteção Nuclear: impede RPC com userId null e Erro 400
    
    const baseKey = tag ? `explore:${tag}` : `feed:global`;
    const userId = currentUserId;
    
    if (previousPageData && previousPageData.length === 0) return null;
    const cursor = pageIndex === 0 ? 'null' : (previousPageData?.[previousPageData.length - 1]?.created_at || 'null');
    return `${baseKey}|${pageIndex}|${userId}|${cursor}`;
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite(
    getKey,
    async (key: string) => {
      const parts = key.split('|');
      // Sanitização blindada com separador Pipe (|) garantindo o índice 2 absoluto
      const userId = (parts[2] === 'undefined' || parts[2] === 'null' || !parts[2]) ? null : parts[2];
      const cursor = (parts[3] === 'undefined' || parts[3] === 'null' || !parts[3]) ? null : parts[3];

      const { data, error } = await supabase.rpc('get_feed_with_state', {
        p_user_id: userId,
        p_cursor: cursor,
        p_limit: PAGE_SIZE,
        p_tag: tag || null
      });

      if (error) throw error;
      return (data || []).map((item: any) => normalizeFeedPost(item));
    },
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      persistSize: true,
      dedupingInterval: 30000,
    }
  );

  // ====================== MOTOR REALTIME INTEGRADO ======================
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`feed_global_realtime_${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        // 1. Buscar Perfil do Autor (Enriquecimento)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username, is_verified')
          .eq('id', payload.new.user_id)
          .single();

        const newPost = normalizeFeedPost({
          ...payload.new,
          author: {
            id: profile?.id,
            full_name: profile?.full_name,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            is_verified: profile?.is_verified,
          },
          stats: { likes: 0, comments: 0, reposts: 0, views: 0 },
          viewer_state: { liked: false, saved: false, following: false },
        });

        // 2. Injetar no SWR sem forçar Refetch
        mutate((currentPages: any) => {
          if (!currentPages) return [[newPost]];
          
          // Evita duplicatas caso o SWR já tenha pegado via polling/refresh
          const allPosts = currentPages.flat();
          if (allPosts.some((p: any) => p.id === newPost.id)) return currentPages;

          const newPages = [...currentPages];
          newPages[0] = [newPost, ...newPages[0]];
          return newPages;
        }, false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, mutate]);

  const posts = data ? data.flat() : [];
  const isLoadingInitial = !data && !error;
  const isLoadingMore = size > 0 && data && typeof data[size - 1] === 'undefined';
  const isReachingEnd = data && data[data.length - 1]?.length < PAGE_SIZE;

  return {
    posts,
    error,
    isLoading: isLoadingInitial,
    isLoadingMore,
    isReachingEnd,
    isValidating,
    loadMore: () => setSize(size + 1),
    refresh: () => mutate(),
    mutate
  };
}
