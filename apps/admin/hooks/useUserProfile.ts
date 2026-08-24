import { supabase } from '@/lib/supabase';
import useSWR from 'swr';
import { getStoredProfile, setStoredProfile } from '@/lib/profile-cache';

export function useUserProfile(userId: string | null) {
  const { data, mutate, error, isValidating } = useSWR(
    userId ? `profile_full:${userId}` : null,
    async () => {
      if (!userId) return null;

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_full_profile_data', {
          p_user_id: userId
        });

        if (!rpcError && rpcData?.profile) {
          setStoredProfile(rpcData.profile);
          return rpcData;
        }
      } catch (rpcErr) {
        console.warn("RPC get_full_profile_data fallback:", rpcErr);
      }

      // Fallback Direto em caso de falha da RPC
      try {
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (pErr || !profile) throw pErr || new Error("Perfil não encontrado");

        const [postsRes, likedRes, savedRes] = await Promise.all([
          supabase.from('posts').select('*').or(`author_id.eq.${userId},user_id.eq.${userId}`).order('created_at', { ascending: false }).limit(50),
          supabase.from('post_likes').select('post:posts(*)').or(`user_id.eq.${userId},profile_id.eq.${userId}`).limit(50),
          supabase.from('saved_posts').select('post:posts(*)').or(`user_id.eq.${userId},profile_id.eq.${userId}`).limit(50)
        ]);

        const fallbackPayload = {
          profile,
          posts: postsRes.data || [],
          liked: (likedRes.data || []).map((l: any) => l.post).filter(Boolean),
          saved: (savedRes.data || []).map((s: any) => s.post).filter(Boolean),
          stories: [],
          highlights: []
        };

        setStoredProfile(profile);

        return fallbackPayload;
      } catch (fallbackErr) {
        console.error("❌ useUserProfile Fallback Error:", fallbackErr);
        throw fallbackErr;
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      fallbackData: (() => {
        const cached = getStoredProfile();
        if (cached && (!userId || cached.id === userId)) {
          return { profile: cached };
        }
        return undefined;
      })()
    }
  );

  return {
    profile: data?.profile || null,
    posts: data?.posts || [],
    liked: data?.liked || [],
    saved: data?.saved || [],
    stories: data?.stories || [],
    highlights: data?.highlights || [],
    isLoading: !data && !error,
    mutate,
    isValidating
  };
}
