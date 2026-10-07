import { supabase } from '@/lib/supabase';
import useSWR from 'swr';
import { getStoredProfile, setStoredProfile } from '@/lib/profile-cache';

export function useUserProfile(userId: string | null) {
  const { data, mutate, error, isValidating } = useSWR(
    userId ? `profile_full:${userId}` : null,
    async () => {
      if (!userId) return null;

      let rpcData: any = null;
      try {
        const { data, error } = await supabase.rpc('get_full_profile_data', { p_user_id: userId });
        if (!error && data?.profile) {
          rpcData = data;
        }
      } catch (rpcErr) {
        console.warn("RPC get_full_profile_data fallback:", rpcErr);
      }

      let profile = rpcData?.profile;
      let postsData = rpcData?.posts || [];
      let likedData = rpcData?.liked || [];
      let savedData = rpcData?.saved || [];
      let storiesData = rpcData?.stories || [];
      let highlightsData = rpcData?.highlights || [];

      if (!profile) {
        try {
          const { data: pData, error: pErr } = await supabase.from('profiles').select('*').eq('id', userId).single();
          if (pErr || !pData) throw pErr || new Error("Perfil não encontrado");
          profile = pData;

          const [postsRes, likedRes, savedRes] = await Promise.all([
            supabase.from('posts').select('*').or(`author_id.eq.${userId},user_id.eq.${userId}`).order('created_at', { ascending: false }).limit(50),
            supabase.from('post_likes').select('post:posts(*)').or(`user_id.eq.${userId},profile_id.eq.${userId}`).limit(50),
            supabase.from('saved_posts').select('post:posts(*)').or(`user_id.eq.${userId},profile_id.eq.${userId}`).limit(50)
          ]);

          postsData = postsRes.data || [];
          likedData = (likedRes.data || []).map((l: any) => l.post).filter(Boolean);
          savedData = (savedRes.data || []).map((s: any) => s.post).filter(Boolean);
        } catch (fallbackErr) {
          console.error("❌ useUserProfile Fallback Error:", fallbackErr);
          throw fallbackErr;
        }
      }


      setStoredProfile(profile);

      return {
        profile,
        posts: postsData,
        liked: likedData,
        saved: savedData,
        stories: storiesData,
        highlights: highlightsData
      };
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
