import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

export function useNotifications(currentUserId: string | null) {
  const { data, mutate, error, isValidating } = useSWR(
    currentUserId ? `notifications:${currentUserId}` : null,
    async () => {
      const { data, error } = await supabase.rpc('get_my_notifications', {
        p_user_id: currentUserId,
        p_limit: 50
      });
      if (error) throw error;
      return data;
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
    deleteNotification,
    refresh: mutate
  };
}
