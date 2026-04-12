"use client";

import React, { useState, useEffect } from 'react';
import { Search, Send, MessageSquare, ArrowLeft, Phone, Video, Info, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(targetUserId);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const { data: msgs } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:profiles!direct_messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (msgs) {
        const convMap = new Map();
        msgs.forEach(m => {
          const otherUser = m.sender_id === user.id ? m.receiver : m.sender;
          if (!otherUser) return;
          if (!convMap.has(otherUser.id)) {
            convMap.set(otherUser.id, {
              id: otherUser.id,
              name: otherUser.full_name,
              avatar: otherUser.avatar_url,
              lastMessage: m.content,
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unread: m.receiver_id === user.id && !m.is_read ? 1 : 0
            });
          }
        });

        // Se viemos de um perfil novo (targetUserId), garante que ele esteja na lista
        if (targetUserId && !convMap.has(targetUserId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

          if (profile) {
            convMap.set(targetUserId, {
              id: profile.id,
              name: profile.full_name,
              avatar: profile.avatar_url,
              lastMessage: 'Iniciar conversa...',
              time: '',
              unread: 0
            });
          }
        }

        setConversations(Array.from(convMap.values()));
      }
    };
    loadConversations();
  }, [targetUserId]);

  useEffect(() => {
    if (!selectedId || !currentUser) return;

    const markAsRead = async () => {
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', currentUser.id)
        .eq('sender_id', selectedId)
        .eq('is_read', false);
      
      // Atualiza localmente o contador de não lidas
      setConversations(prev => prev.map(c => 
        c.id === selectedId ? { ...c, unread: 0 } : c
      ));
    };

    const fetchMessages = async () => {
      markAsRead();
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
    };

    fetchMessages();

    // ESCUTA PARA A CONVERSA ATIVA
    const channel = supabase
      .channel(`chat_${selectedId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages'
      }, (payload) => {
        const newMessage = payload.new;
        if (
          (newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedId) ||
          (newMessage.sender_id === selectedId && newMessage.receiver_id === currentUser.id)
        ) {
          setMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();

    // ESCUTA GLOBAL PARA A SIDEBAR (Conversas)
    const sidebarChannel = supabase
      .channel('global_chat_updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages'
      }, async (payload) => {
        const newMessage = payload.new;
        if (newMessage.sender_id === currentUser.id || newMessage.receiver_id === currentUser.id) {
          loadConversations();
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      supabase.removeChannel(sidebarChannel);
    };
  }, [selectedId, currentUser]);

  const loadConversations = async () => {
    if (!currentUser) return;
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:profiles!direct_messages_sender_id_fkey(id, full_name, avatar_url),
        receiver:profiles!direct_messages_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (msgs) {
      const convMap = new Map();
      msgs.forEach(m => {
        const otherUser = m.sender_id === currentUser.id ? m.receiver : m.sender;
        if (!otherUser) return;
        if (!convMap.has(otherUser.id)) {
          convMap.set(otherUser.id, {
            id: otherUser.id,
            name: otherUser.full_name,
            avatar: otherUser.avatar_url,
            lastMessage: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: m.receiver_id === currentUser.id && !m.is_read ? 1 : 0
          });
        }
      });
      setConversations(Array.from(convMap.values()));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || !selectedId || !currentUser) return;

    const content = message;
    setMessage('');

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: selectedId,
        content: content
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao enviar:", error);
      alert("Falha ao enviar mensagem.");
    }
  };

  const selectedChat = conversations.find(c => c.id === selectedId);

  return (
    <div className="flex h-screen bg-[#0b141a] text-gray-100 overflow-hidden">
      {/* Sidebar - Lista de Conversas */}
      <div className={cn(
        "w-full md:w-[350px] lg:w-[400px] border-r border-white/5 flex flex-col transition-all",
        selectedId ? "hidden md:flex" : "flex"
      )}>
        {/* Header Sidebar */}
        <div className="p-4 bg-[#202c33] flex items-center justify-between">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/profile')}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                 <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Conversas</h1>
           </div>
           <MessageSquare className="w-5 h-5 text-gray-400" />
        </div>

        {/* Busca */}
        <div className="p-3 bg-[#0b141a]">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Pesquisar mensagens"
                className="w-full bg-[#202c33] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none placeholder:text-gray-500"
              />
           </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {conversations.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer hover:bg-[#202c33] transition-all",
                  selectedId === chat.id ? "bg-[#2a3942]" : ""
                )}
              >
                 <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <img src={chat.avatar} className="w-full h-full object-cover" alt="" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                       <h3 className="font-semibold truncate">{chat.name}</h3>
                       <span className="text-[10px] text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{chat.lastMessage}</p>
                 </div>
                 {chat.unread > 0 && (
                    <div className="w-5 h-5 bg-whatsapp-green text-whatsapp-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                       {chat.unread}
                    </div>
                 )}
              </div>
           ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#0b141a] relative",
        !selectedId ? "hidden md:flex items-center justify-center italic text-gray-500" : "flex"
      )}>
        {!selectedId ? (
          <div className="text-center">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-gray-700" />
             </div>
             <p>Selecione uma conversa para começar</p>
          </div>
        ) : (
          <>
            {/* Header Chat */}
            <div className="sticky top-0 z-20 p-4 bg-[#202c33]/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between shadow-lg">
               <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedId(null)} className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full">
                     <ArrowLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden">
                     <img src={selectedChat?.avatar} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div>
                     <h2 className="font-bold text-sm sm:text-base leading-none text-white">{selectedChat?.name}</h2>
                     <span className="text-[10px] text-whatsapp-green font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-whatsapp-green animate-pulse" />
                        online
                     </span>
                  </div>
               </div>
               <div className="flex items-center gap-3 sm:gap-5 text-gray-400">
                  {/* Ícones de chamada removidos até implementação das features */}
               </div>
            </div>

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3 relative"
              style={{
                backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
                backgroundSize: '400px',
                backgroundBlendMode: 'overlay',
                backgroundColor: '#0b141a'
              }}
            >
               {messages.map((m: any) => (
                  <div 
                    key={m.id}
                    className={cn(
                      "max-w-[85%] sm:max-w-[75%] p-3 px-4 rounded-2xl text-[13px] sm:text-sm shadow-md border animate-in fade-in slide-in-from-bottom-2 duration-300",
                      m.sender_id === currentUser?.id 
                        ? "self-end bg-[#005c4b] text-white rounded-tr-none border-[#005c4b]" 
                        : "self-start bg-[#202c33] text-gray-200 rounded-tl-none border-white/5"
                    )}
                  >
                     {m.content}
                     <div className={cn(
                       "text-[9px] text-right mt-1 opacity-60 font-medium flex items-center justify-end gap-1",
                       m.sender_id === currentUser?.id ? "text-whatsapp-green" : "text-gray-500"
                     )}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        
                        {m.sender_id === currentUser?.id && (
                           m.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                           ) : (
                              <Check className="w-3.5 h-3.5" />
                           )
                        )}
                     </div>
                  </div>
               ))}
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-4 bg-[#202c33] border-t border-white/5 pb-6">
               <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-5xl mx-auto">
                  <div className="flex-1 relative">
                     <input 
                       type="text" 
                       placeholder="Digite uma mensagem"
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                       className="w-full bg-[#2a3942] rounded-xl py-3 px-5 text-sm focus:outline-none placeholder:text-gray-500 text-white border border-transparent focus:border-whatsapp-green/30 transition-all shadow-inner"
                     />
                  </div>
                  <button 
                    disabled={!message.trim()}
                    className="w-12 h-12 rounded-xl bg-whatsapp-green flex items-center justify-center text-whatsapp-dark active:scale-95 transition-all shadow-[0_4px_10px_rgba(37,211,102,0.3)] disabled:opacity-50 disabled:grayscale"
                  >
                     <Send className="w-5 h-5 fill-current" />
                  </button>
               </form>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
