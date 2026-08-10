import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

export function useUserProfile(userId: string | null) {
  const { data, mutate, error, isValidating } = useSWR(
    userId ? `profile_full:${userId}` : null,
    async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_full_profile_data', {
        p_user_id: userId
      });
      
      console.log("🔍 useUserProfile RPC Response:", { data, error, userId });

      if (error) {
        console.error("❌ useUserProfile RPC Error:", error);
        throw error;
      }
      
      if (data?.profile) {
        localStorage.setItem('fc_profile_cache', JSON.stringify({
          data: data.profile,
          timestamp: Date.now()
        }));
      }
      
      return data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      fallbackData: (() => {
        // Hydration segura: Só usa o cache se o ID bater
        if (typeof window === 'undefined') return undefined;
        const cachedStr = localStorage.getItem('fc_profile_cache');
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr);
            // TTL de 24 horas (86400000 ms)
            if (cached.timestamp && (Date.now() - cached.timestamp < 86400000)) {
              return { profile: cached.data };
            } else {
              localStorage.removeItem('fc_profile_cache');
            }
          } catch (e) { return undefined; }
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
