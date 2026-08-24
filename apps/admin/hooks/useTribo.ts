import useSWRInfinite from 'swr/infinite';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useTribo(currentUserId: string | null, initialReelId?: string | null) {
  const getKey = (pageIndex: number, previousPageData: any[] | null) => {
    if (previousPageData && previousPageData.length === 0) return null;
    const lastReel = previousPageData?.[previousPageData.length - 1];
    return ['tribo_reels', currentUserId, lastReel?.created_at || null, initialReelId || 'default'];
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite(
    getKey,
    async ([_, userId, cursor]) => {
      // Se não tem cursor (primeira página) e tem um ID específico, buscamos ele primeiro
      if (!cursor && initialReelId) {
        const { data: initialData } = await supabase.rpc('get_tribo_reels', {
          p_user_id: userId,
          p_cursor: null,
          p_limit: 10
        });
        
        const { data: specificData } = await supabase
          .from('posts')
          .select('*')
          .eq('id', initialReelId)
          .single();
          
        if (specificData) {
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', specificData.author_id)
            .single();

          // Passo 3: Verifica o estado real de interações do usuário logado
          let isLiked = false, isSaved = false, isReposted = false;
          if (userId) {
            const [likeRes, saveRes, repostRes] = await Promise.all([
              supabase.from('post_likes').select('id').eq('post_id', specificData.id).or(`profile_id.eq.${userId},user_id.eq.${userId}`).maybeSingle(),
              supabase.from('saved_posts').select('id').eq('post_id', specificData.id).or(`profile_id.eq.${userId},user_id.eq.${userId}`).maybeSingle(),
              supabase.from('reposts').select('id').eq('post_id', specificData.id).or(`profile_id.eq.${userId},user_id.eq.${userId}`).maybeSingle()
            ]);
            isLiked = !!likeRes.data;
            isSaved = !!saveRes.data;
            isReposted = !!repostRes.data;
          }

          const formattedSpecific = {
            ...specificData,
            author_id: authorProfile?.id || specificData.author_id,
            author_name: authorProfile?.full_name || authorProfile?.username || 'Usuário',
            author_username: authorProfile?.username || 'user',
            author_avatar: authorProfile?.avatar_url || null,
            is_liked: isLiked,
            is_reposted: isReposted,
            is_saved: isSaved
          };
          
          let list = initialData || [];
          // Remove o especifico da lista se já estiver lá
          list = list.filter((r: any) => r.id !== initialReelId);
          return [formattedSpecific, ...list];
        }
        return initialData || [];
      }

      const { data, error } = await supabase.rpc('get_tribo_reels', {
        p_user_id: userId,
        p_cursor: cursor,
        p_limit: 10
      });
      if (error) throw error;
      return data;
    },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const reels = data ? data.flat() : [];
  const isLoading = !data && !error;
  const isReachingEnd = data && data[data.length - 1]?.length < 10;

  useEffect(() => {
    if (!currentUserId) return;

    // Realtime: Ouve novos vídeos (Lumes / Tribo)
    const channel = supabase
      .channel('tribo_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'posts',
        filter: "post_type=eq.video" 
      }, async (payload) => {
        // Enriquece o novo post com dados do autor para injeção imediata
        const { data: author } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', payload.new.author_id)
          .single();

        const enrichedNew = { 
          ...payload.new, 
          author_id: author?.id || payload.new.author_id,
          author_name: author?.full_name || author?.username || 'Usuário',
          author_username: author?.username || 'user',
          author_avatar: author?.avatar_url || null,
          is_liked: false,
          is_reposted: false,
          is_saved: false
        };

        mutate((currentPages: any) => {
          if (!currentPages) return [[enrichedNew]];
          const newFirstPage = [enrichedNew, ...currentPages[0]];
          return [newFirstPage, ...currentPages.slice(1)];
        }, false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, mutate]);


  return {
    reels,
    isLoading,
    isReachingEnd,
    loadMore: () => setSize(size + 1),
    mutate
  };
}
