"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Send, MessageSquare, ArrowLeft, Check, CheckCheck, Camera, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useChat } from '@/hooks/useChat';
import { compressImage } from '@/lib/image-compression';

function MessagesContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(targetUserId);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const [viewportHeight, setViewportHeight] = useState<string>('100dvh');
  const [viewportTop, setViewportTop] = useState<number>(0);

  useEffect(() => {
    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
        setViewportTop(window.visualViewport.offsetTop);
      } else {
        setViewportHeight(`${window.innerHeight}px`);
        setViewportTop(0);
      }
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    } else {
      window.addEventListener('resize', updateViewport);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      } else {
        window.removeEventListener('resize', updateViewport);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active && user) setCurrentUser(user);
    }).catch(() => {
      if (active) toast.error("Não foi possível verificar sua conta.");
    }).finally(() => {
      if (active) setIsAuthLoading(false);
    });
    return () => { active = false; };
  }, []);

  const {
    conversations,
    isLoading,
    messages,
    sendMessage,
    scrollRef,
    mutateConversations
  } = useChat(currentUser?.id || null, selectedId);

  const handleSendMessage = async (e?: React.FormEvent, customContent?: string) => {
    e?.preventDefault();
    const contentToSend = customContent || message;
    if (!contentToSend.trim() || isSending) return false;

    setIsSending(true);
    try {
      const { error } = await sendMessage(contentToSend);
      if (error) {
        toast.error("Falha ao enviar mensagem. Tente novamente.");
        return false;
      }
      if (!customContent) setMessage((current) => current === contentToSend ? '' : current);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem. Tente novamente.");
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, useCamera = false) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !selectedId) return;

    setIsUploading(true);
    const toastId = toast.loading("Enviando mídia...");

    try {
      const compressedBlob = await compressImage(file, 1200, 0.8);
      const fileName = `${currentUser.id}/${Date.now()}.webp`;
      const filePath = `chat-media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const sent = await handleSendMessage(undefined, publicUrl);
      if (!sent) throw new Error("Não foi possível enviar a imagem na conversa.");
      toast.success("Mídia enviada!", { id: toastId });
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error("Erro ao enviar imagem.", { id: toastId });
      supabase.from('system_errors').insert({
        module: 'chat',
        error_message: `Falha no upload de mídia de chat: ${err.message}`,
        severity: 'high',
        user_id: currentUser.id
      });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const [targetUserProfile, setTargetUserProfile] = useState<any>(null);

  useEffect(() => {
    let active = true;
    setTargetUserProfile(null);
    if (selectedId && !conversations.some((c: any) => c.id === selectedId)) {
      supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', selectedId)
        .single()
        .then(({ data }) => {
          if (active && data) setTargetUserProfile(data);
        });
    }
    return () => { active = false; };
  }, [selectedId, conversations]);

  const filteredConversations = useMemo(() => {
    return (conversations || []).filter((c: any) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const nameMatch = c.name?.toLowerCase().includes(query);
      const lastMsgMatch = c.lastMessage?.toLowerCase().includes(query);
      return nameMatch || lastMsgMatch;
    });
  }, [conversations, searchQuery]);

  const selectedChat = useMemo(() => {
    return conversations.find((c: any) => c.id === selectedId) || (targetUserProfile ? {
      id: targetUserProfile.id,
      name: targetUserProfile.full_name || targetUserProfile.username || 'Irmão(ã) FéConecta',
      avatar: targetUserProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      is_online: false
    } : null);
  }, [conversations, selectedId, targetUserProfile]);

  if (isAuthLoading) {
    return <main className="min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-[#0b141a]" aria-label="Carregando conversas"><Loader2 className="w-8 h-8 animate-spin text-whatsapp-green" /></main>;
  }

  if (!currentUser) {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-[#0b141a] px-6 text-center">
        <MessageSquare className="w-10 h-10 text-whatsapp-green" aria-hidden="true" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Entre para acessar suas conversas</h1>
        <Link href="/login" className="rounded-xl bg-whatsapp-green px-5 py-3 font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green">Entrar</Link>
      </main>
    );
  }

  return (
    <div
      className="fixed left-0 w-full z-[110] flex bg-gray-50 dark:bg-[#0b141a] text-gray-900 dark:text-gray-100 overflow-hidden"
      style={{
        top: viewportTop,
        height: viewportHeight,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Sidebar - Lista de Conversas */}
      <div className={cn(
        "w-full md:w-[350px] lg:w-[400px] border-r border-gray-200 dark:border-white/5 flex flex-col transition-all bg-white dark:bg-[#111b21] h-full",
        selectedId ? "hidden md:flex" : "flex"
      )}>
        {/* Header Sidebar */}
        <div className="p-4 bg-gray-50 dark:bg-[#202c33] flex items-center justify-between border-b border-gray-200 dark:border-transparent">
          <div className="flex items-center gap-3">
            <Link href="/profile" aria-label="Voltar ao perfil" className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-600 dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold dark:text-white text-gray-900">Conversas</h1>
          </div>
          <MessageSquare className="w-5 h-5 text-gray-400" />
        </div>

        {/* Busca */}
        <div className="p-3 bg-white dark:bg-[#0b141a]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              aria-label="Pesquisar conversas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar mensagens…"
              className="w-full bg-gray-100 dark:bg-[#202c33] rounded-lg py-2 pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green placeholder:text-gray-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Lista de Ativos Agora (Online) - Carrossel Horizontal */}
        <div className="py-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#111b21]">
          <div className="px-4 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ativos Agora</span>
          </div>
          <div className="flex gap-4 overflow-x-auto px-4 no-scrollbar pb-1">
            {conversations.map((chat: any) => (
              <button
                type="button"
                key={`active-${chat.id}`}
                onClick={() => setSelectedId(chat.id)}
                aria-label={`Abrir conversa com ${chat.name}`}
                className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity min-w-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green rounded-xl"
              >
                <div className="relative">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl overflow-hidden border-2 p-0.5 transition-all duration-500",
                    chat.is_online
                      ? "border-whatsapp-green shadow-[0_0_10px_rgba(37,211,102,0.4)] animate-pulse"
                      : "border-gray-300 dark:border-white/10 grayscale opacity-60"
                  )}>
                    <img src={chat.avatar} width={56} height={56} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-[14px]" alt="" />
                  </div>
                  {chat.is_online && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-whatsapp-green border-2 border-white dark:border-[#111b21] rounded-full" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-bold truncate w-14 text-center transition-colors",
                  chat.is_online ? "text-whatsapp-green" : "text-gray-500 dark:text-gray-400"
                )}>
                  {(chat?.name || '...').split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0">
          {isLoading ? (
            <div className="flex flex-col">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-gray-50 dark:border-white/5 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center h-full">
              <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
              {searchQuery ? "Nenhuma conversa encontrada." : "Nenhuma conversa iniciada ainda."}
            </div>
          ) : (
            filteredConversations.map((chat: any) => (
              <button
                type="button"
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                aria-pressed={selectedId === chat.id}
                className={cn(
                  "w-full text-left flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202c33] transition-colors border-b border-gray-50 dark:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-whatsapp-green",
                  selectedId === chat.id ? "bg-gray-100 dark:bg-[#2a3942]" : ""
                )}
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div className={cn(
                    "w-full h-full rounded-full overflow-hidden border border-black/5 dark:border-white/5 transition-all duration-500",
                    chat.is_online ? "ring-2 ring-whatsapp-green ring-offset-2 dark:ring-offset-[#111b21]" : "grayscale opacity-70"
                  )}>
                    <img src={chat.avatar} width={48} height={48} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="" />
                  </div>
                  {chat.is_online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-whatsapp-green border-2 border-white dark:border-[#111b21] rounded-full shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold truncate">{chat.name}</h3>
                    <span className="text-[10px] text-gray-500">
                      {new Date(chat.time).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {chat.sender_id === currentUser?.id && (
                      chat.is_read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                      )
                    )}
                    <p className="text-sm text-gray-400 truncate flex-1">{chat.lastMessage}</p>
                  </div>
                </div>
                {chat.unread > 0 && (
                  <div className="w-5 h-5 bg-whatsapp-green text-whatsapp-dark text-[10px] font-bold rounded-full flex items-center justify-center">
                    {chat.unread}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-gray-50 dark:bg-[#0b141a] relative transition-colors h-full overflow-hidden",
        !selectedId ? "hidden md:flex items-center justify-center italic text-gray-500" : "flex w-full"
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
            <div className="sticky top-0 z-20 p-4 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5 flex items-center justify-between shadow-sm dark:shadow-lg">
              <div className="flex items-center gap-3">
                 <button onClick={() => setSelectedId(null)} aria-label="Voltar para a lista de conversas" className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green">
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="w-full h-full rounded-full border border-black/5 dark:border-white/10 overflow-hidden">
                    <img src={selectedChat?.avatar} width={40} height={40} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="" />
                  </div>
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base leading-none text-gray-900 dark:text-white">{selectedChat?.name}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-5 text-gray-400">
                {/* Ícones de chamada removidos até implementação das features */}
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3 relative bg-[#e5ddd5] dark:bg-transparent"
              style={{
              }}
            >
              {messages.map((m: any) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] sm:max-w-[75%] p-3 px-4 rounded-2xl text-[13px] sm:text-sm shadow-sm border animate-in fade-in slide-in-from-bottom-2 duration-300",
                    m.sender_id === currentUser?.id
                      ? "self-end bg-[#005c4b] text-white rounded-tr-none border-[#005c4b]"
                      : "self-start bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-200 rounded-tl-none border-gray-100 dark:border-white/5"
                  )}
                >
                  {(() => {
                    const isImg = m.content.match(/\.(jpeg|jpg|gif|png|webp)/i) || (m.content.startsWith('https://') && (m.content.includes('/storage/v1/object/public/') || m.content.includes('supabase')));
                    if (!isImg) return m.content;

                    let imgSrc = m.content;
                    if (imgSrc.includes('dfqgmrhgwgozjqhhbblp.supabase.co') && process.env.NEXT_PUBLIC_SUPABASE_URL) {
                      imgSrc = imgSrc.replace('https://dfqgmrhgwgozjqhhbblp.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_URL);
                    }

                    return (
                      <div className="mb-1 rounded-lg overflow-hidden border border-black/10">
                        <a href={imgSrc} target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem enviada em uma nova aba" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green">
                          <img
                            src={imgSrc}
                            width={1200}
                            height={900}
                            loading="lazy"
                            decoding="async"
                            alt="Imagem enviada"
                            className="max-w-full h-auto max-h-[300px] object-cover hover:opacity-90 transition-opacity"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </a>
                      </div>
                    );
                  })()}
                  <div className={cn(
                    "text-[9px] text-right mt-1 opacity-60 font-medium flex items-center justify-end gap-1",
                    m.sender_id === currentUser?.id ? "text-whatsapp-green" : "text-gray-500"
                  )}>
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}

                    {m.sender_id === currentUser?.id && (
                      m.is_read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                      ) : m.is_delivered ? (
                        <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-gray-400" />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-4 bg-white dark:bg-[#202c33] border-t border-gray-200 dark:border-transparent mt-auto z-20">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e)}
                className="hidden"
                accept="image/*"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={(e) => handleFileUpload(e, true)}
                className="hidden"
                accept="image/*"
                capture="environment"
              />

              <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2 sm:gap-3 max-w-5xl mx-auto">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => cameraInputRef.current?.click()}
                    aria-label="Tirar foto para enviar"
                    className="p-2 sm:p-3 text-gray-500 hover:text-whatsapp-green hover:bg-white/5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green"
                  >
                    <Camera className="w-5 h-5 sm:w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Anexar imagem"
                    className="p-2 sm:p-3 text-gray-500 hover:text-whatsapp-green hover:bg-white/5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green"
                  >
                    <Image className="w-5 h-5 sm:w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    aria-label="Digite uma mensagem"
                    placeholder={isUploading ? "Enviando imagem…" : "Digite uma mensagem…"}
                    value={message}
                    disabled={isUploading}
                    onChange={(e) => setMessage(e.target.value)}
                    onFocus={() => {
                      setTimeout(() => {
                        if (scrollRef.current) {
                          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                        }
                      }, 300);
                    }}
                    className="w-full bg-white dark:bg-[#2a3942] rounded-xl py-3 px-5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green/50 placeholder:text-gray-500 text-gray-900 dark:text-white border border-gray-200 dark:border-transparent transition-colors shadow-sm"
                  />
                </div>
                <button
                    type="submit"
                    disabled={(!message.trim() && !isUploading) || isUploading || isSending}
                  aria-label="Enviar mensagem"
                  className="w-12 h-12 rounded-xl bg-whatsapp-green flex items-center justify-center text-whatsapp-dark active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-green focus-visible:ring-offset-2 shadow-[0_4px_10px_rgba(37,211,102,0.3)] disabled:opacity-50 disabled:grayscale"
                >
                  {isUploading || isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 fill-current" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      ` }} />
    </div>
  );
}


export default function MessagesPage() {
  return (
    <React.Suspense fallback={<main className="min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-[#0b141a]" role="status"><Loader2 className="w-8 h-8 animate-spin text-whatsapp-green" /><span className="sr-only">Carregando conversas…</span></main>}>
      <MessagesContent />
    </React.Suspense>
  );
}
