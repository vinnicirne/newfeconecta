import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Cache global em memória para evitar que 1000 usuários façam 1000 requisições 
// simultâneas ao banco de dados cada vez que alguém enviar uma mensagem.
const profileCache = new Map<string, { full_name: string, avatar_url: string }>();
const pendingFetches = new Map<string, Promise<any>>();

async function getCachedProfile(userId: string) {
  if (profileCache.has(userId)) return profileCache.get(userId);
  if (pendingFetches.has(userId)) return pendingFetches.get(userId);

  const promise = (async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single();
      
    if (data) profileCache.set(userId, data);
    pendingFetches.delete(userId);
    return data;
  })();
  
  pendingFetches.set(userId, promise);
  return promise;
}

export function useRoomChat(roomId: string, userId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    // 1. Carregamento Inicial Atômico
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles!user_id(full_name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        setMessages(data.reverse());
        scrollToBottom();
      }
    };

    fetchMessages();

    // 2. Listener de Mensagens Exclusivo
    const channel = supabase
      .channel(`room_chat_${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `room_id=eq.${roomId}` 
      }, async (payload) => {
        const profile = await getCachedProfile(payload.new.user_id);

        const newMessage = {
          ...payload.new,
          user_name: profile?.full_name || 'Intercessor',
          avatar_url: profile?.avatar_url
        };

        setMessages((prev: any[]) => {
          if (prev.some((m: any) => m.id === (newMessage as any).id)) return prev;
          return [...prev, newMessage];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendRoomMessage = async (content: string, mediaUrl?: string) => {
    // 1. Inserção Otimista (Optimistic UI) para feedback imediato
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      room_id: roomId,
      user_id: userId,
      content: content,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
      user_name: 'Você',
      avatar_url: '' // Será substituído pelo Realtime ou re-fetch
    };

    // Tenta carregar o perfil do usuário para a mensagem otimista
    getCachedProfile(userId).then(profile => {
      if (profile) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, user_name: profile.full_name, avatar_url: profile.avatar_url } : m));
      }
    });

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    // 2. Persistência no Banco
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: userId,
        content: content,
        media_url: mediaUrl
      })
      .select('*, profiles!user_id(full_name, avatar_url)')
      .single();

    // 3. Reconciliação
    if (data && !error) {
      setMessages(prev => prev.map(m => m.id === tempId ? { 
        ...data, 
        user_name: data.profiles?.full_name || 'Intercessor',
        avatar_url: data.profiles?.avatar_url
      } : m));
    } else {
      // Reverter em caso de erro
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }

    return { data, error };
  };

  return {
    messages,
    sendRoomMessage,
    chatEndRef
  };
}
