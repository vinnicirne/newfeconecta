import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useProfileConnections() {
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [connectionsType, setConnectionsType] = useState<'followers' | 'following'>('followers');
  const [connectionsData, setConnectionsData] = useState<any[]>([]);

  const fetchConnections = async (type: 'followers' | 'following', profileId: string) => {
    setConnectionsType(type);
    setIsConnectionsOpen(true);
    setConnectionsData([]);

    try {
      const query = supabase.from('follows').select('follower_id, following_id');
      if (type === 'followers') query.eq('following_id', profileId);
      else query.eq('follower_id', profileId);

      const { data: follows } = await query;
      if (!follows || follows.length === 0) return;

      const userIds = follows.map(f => type === 'followers' ? f.follower_id : f.following_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profiles) {
        setConnectionsData(profiles);
      }
    } catch (err) {
      console.error("Erro ao buscar conexões:", err);
    }
  };

  return {
    isConnectionsOpen,
    setIsConnectionsOpen,
    connectionsType,
    connectionsData,
    fetchConnections
  };
}
