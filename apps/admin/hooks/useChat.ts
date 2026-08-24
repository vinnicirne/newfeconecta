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
      try {
        const { data, error } = await supabase.rpc('get_my_conversations', { p_user_id: currentUserId });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (rpcErr) {
        console.warn("RPC get_my_conversations fallback:", rpcErr);
      }

      // Fallback Direto na tabela direct_messages
      try {
        const { data: rawMsgs, error: msgErr } = await supabase
          .from('direct_messages')
          .select('id, sender_id, receiver_id, content, created_at, is_read')
          .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (msgErr || !rawMsgs || rawMsgs.length === 0) return [];

        const otherUserIds = Array.from(new Set(
          rawMsgs.map((m: any) => m.sender_id === currentUserId ? m.receiver_id : m.sender_id).filter(Boolean)
        ));

        if (otherUserIds.length === 0) return [];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', otherUserIds);

        const profileMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const conversationMap = new Map<string, any>();

        for (const msg of rawMsgs) {
          const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
          if (!conversationMap.has(partnerId)) {
            const partner = profileMap[partnerId] || {};
            conversationMap.set(partnerId, {
              id: partnerId,
              name: partner.full_name || partner.username || 'Irmão(ã) FéConecta',
              avatar: partner.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              lastMessage: msg.content,
              time: msg.created_at,
              unread: (msg.receiver_id === currentUserId && !msg.is_read) ? 1 : 0,
              is_online: false,
              sender_id: msg.sender_id,
              is_read: msg.is_read
            });
          }
        }

        return Array.from(conversationMap.values());
      } catch (fallbackErr) {
        console.error("Erro ao carregar conversas via fallback:", fallbackErr);
        return [];
      }
    },
    { refreshInterval: 30000 }
  );

  // 2. Fetch de Histórico (Ativo)
  useEffect(() => {
    if (!currentUserId || !selectedId) {
      setMessages([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase.rpc('get_chat_history', {
          p_user_id: currentUserId,
          p_other_id: selectedId,
          p_limit: 50
        });

        if (!error && Array.isArray(data) && data.length > 0) {
          setMessages([...data].reverse());
          scrollToBottom();
          return;
        }
      } catch (rpcErr) {
        console.warn("RPC get_chat_history fallback:", rpcErr);
      }

      // Fallback Direto
      try {
        const { data: rawHistory, error: histErr } = await supabase
          .from('direct_messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true })
          .limit(50);

        if (!histErr && rawHistory) {
          setMessages(rawHistory);
          scrollToBottom();
        }
      } catch (err) {
        console.error("Erro ao buscar histórico via fallback:", err);
      }
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
