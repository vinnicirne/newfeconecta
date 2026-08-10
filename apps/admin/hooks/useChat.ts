import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

export function useChat(currentUserId: string | null, selectedId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch de Conversas (Sidebar)
  const { data: conversations, mutate: mutateConversations } = useSWR(
    currentUserId ? `conversations:${currentUserId}` : null,
    async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase.rpc('get_my_conversations', { p_user_id: currentUserId });
      console.log("📨 [useChat] Conversas recebidas:", data);
      if (error) throw error;
      return data;
    },
    { refreshInterval: 60000 } // Revalida a cada minuto
  );

  // 2. Fetch de Histórico (Ativo)
  useEffect(() => {
    if (!currentUserId || !selectedId) {
      setMessages([]);
      return;
    }

    const fetchHistory = async () => {
      const { data, error } = await supabase.rpc('get_chat_history', {
        p_user_id: currentUserId,
        p_other_id: selectedId,
        p_limit: 50
      });
      if (error) return;
      // Reverter para ordem cronológica
      setMessages((data || []).reverse());
      scrollToBottom();
    };

    fetchHistory();

    // 3. Realtime Cirúrgico para Conversa Ativa
    const channel = supabase
      .channel(`chat_active_${selectedId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (
          (msg.sender_id === currentUserId && msg.receiver_id === selectedId) ||
          (msg.sender_id === selectedId && msg.receiver_id === currentUserId)
        ) {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => {
               if (prev.some(p => p.id === msg.id)) return prev;
               return [...prev, msg as any];
            });
            scrollToBottom();
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(p => p.id !== msg.id));
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(p => p.id === msg.id ? (msg as any) : p));
          }
          mutateConversations(); // Atualiza a sidebar
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedId, currentUserId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const sendMessage = async (content: string) => {
    if (!currentUserId || !selectedId || !content.trim()) {
      return { data: null, error: { message: "Validation failed" } };
    }
    
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: selectedId,
        content: content
      })
      .select()
      .single();

    if (!error && data) {
       // 1. Inserir Notificação para disparar o Banner de Push
       await supabase.from('notifications').insert({
         recipient_id: selectedId,
         sender_id: currentUserId,
         type: 'message',
         content: content.length > 50 ? content.substring(0, 47) + '...' : content
       });

       // 2. Injeção otimista local
       setMessages(prev => {
         if (prev.some(p => p.id === data.id)) return prev;
         return [...prev, data];
       });
       scrollToBottom();
       mutateConversations();
    }
    return { data, error };
  };

  return {
    conversations: conversations || [],
    messages,
    sendMessage,
    scrollRef,
    mutateConversations
  };
}
