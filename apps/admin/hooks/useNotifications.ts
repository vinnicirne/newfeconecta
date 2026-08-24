import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

export function useNotifications(currentUserId: string | null) {
  const { data, mutate, error, isValidating } = useSWR(
    currentUserId ? `notifications:${currentUserId}` : null,
    async () => {
      try {
        const { data, error } = await supabase.rpc('get_my_notifications', {
          p_user_id: currentUserId,
          p_limit: 50
        });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[useNotifications] RPC fallback to direct query");
      }

      // Fallback seguro direto na tabela
      const { data: directData, error: directErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (directErr) throw directErr;
      return directData || [];
    },
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    if (!currentUserId) return;

    // Realtime: Ouve novas notificações chegando
    const channel = supabase
      .channel(`notifs_page_${currentUserId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `recipient_id=eq.${currentUserId}` 
      }, (payload) => {
        const newNotif = payload.new;
        mutate((currentNotifs: any) => {
          if (!currentNotifs) return [newNotif];
          if (currentNotifs.some((n: any) => n.id === newNotif.id)) return currentNotifs;
          return [newNotif, ...currentNotifs];
        }, false);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        mutate((currentNotifs: any) => {
           return currentNotifs?.filter((n: any) => n.id !== payload.old.id) || [];
        }, false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, mutate]);

  const markAsRead = async (id: string) => {
    // UI Otimista: Marca como lida na hora no cache
    mutate((currentNotifs: any) => {
      return currentNotifs?.map((n: any) => n.id === id ? { ...n, is_read: true } : n) || [];
    }, false);

    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    mutate((currentNotifs: any) => {
      return currentNotifs?.map((n: any) => ({ ...n, is_read: true })) || [];
    }, false);

    try {
      await supabase.rpc('mark_all_notifications_as_read');
    } catch (e) {
      if (currentUserId) {
        await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', currentUserId);
      }
    }
  };

  const deleteNotification = async (id: string) => {
    // UI Otimista: Remove da lista na hora
    mutate((currentNotifs: any) => {
      return currentNotifs?.filter((n: any) => n.id !== id) || [];
    }, false);

    await supabase.from('notifications').delete().eq('id', id);
  };

  return {
    notifications: data || [],
    isLoading: !data && !error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: mutate
  };
}
