"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, Mic, MicOff, Send, ArrowLeft, Hand, UserPlus, Clock as ClockIcon, Search, PhoneOff, Check, Ban, Headphones, VolumeX, Users, Trash2, ShieldAlert, ShieldOff, Link, Share2, Paperclip, Lock, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LiveKitRoom,
  useParticipants,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useDataChannel,
  StartAudio,
  useAudioPlayback,
} from "@livekit/components-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import { compressImage } from "@/lib/image-compression";
import { useRoomChat } from "@/hooks/useRoomChat";

// --- Types ---
interface WarRoomProps {
  roomId: string;
  user: any;
  onExit: () => void;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  avatar_url?: string;
}

interface Reaction {
  id: number;
  emoji: string;
  x: number;
  offset: number;
}

import { ChatOverlay } from "./ChatOverlay";
import { MicCheckModal } from "./MicCheckModal";
import { WarRoomSettings } from "./WarRoomSettings";
import { useWarRoomRealtime } from "../../hooks/war-room/useWarRoomRealtime";
import { useWarRoomTimer } from "../../hooks/war-room/useWarRoomTimer";
import { useMicrophoneControl } from "../../hooks/war-room/useMicrophoneControl";

export function WarRoom({ roomId, user, onExit }: WarRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: room, error: roomError } = await supabase.from('rooms').select('*, profiles:creator_id(full_name, avatar_url)').eq('id', roomId).single();
      if (roomError || !room) { toast.error("Sala não encontrada"); onExit(); return; }
      
      // --- VERIFICAÇÃO ATÔMICA DE SALA ZUMBI ---
      const endTime = moment(room.created_at).add(room.duration_minutes || 60, 'minutes');
      if (endTime.isBefore(moment()) || room.status === 'ended') {
        if (room.status !== 'ended') {
          await supabase.from('rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', roomId);
        }
        toast.error("Este momento de clamor já foi encerrado. 🙏");
        onExit();
        return;
      }

      setRoomData(room);

      const isCreator = room.creator_id === user.id;

      // --- TRAVA DE SEGURANÇA NUCLEAR PARA SALAS PRIVADAS ---
      if (room.visibility === 'private' && !isCreator) {
        const { data: participation } = await supabase
          .from('participants')
          .select('id')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!participation) {
          await supabase.from('system_errors').insert({
            module: 'ROOM_SECURITY',
            error_message: `Acesso NEGADO: Usuário ${user.id} tentou entrar na Sala Privada ${roomId}`,
            severity: 'high'
          });
          toast.error("Este clamor é privado. Você precisa de um convite para entrar. 🙏");
          onExit();
          return;
        }
      }

      if (room.creator_id === user.id) {
        await supabase.from('participants').upsert({ room_id: roomId, user_id: user.id, role: 'creator' }, { onConflict: 'room_id,user_id' });
      } else {
        // Se for convidado, atualizamos o status de 'invited' para 'listener' ou mantemos para controle? 
        // Vamos apenas garantir que ele esteja lá.
        const { data: existing } = await supabase.from('participants').select('role').eq('room_id', roomId).eq('user_id', user.id).maybeSingle();
        if (!existing) {
           await supabase.from('participants').upsert({ room_id: roomId, user_id: user.id, role: 'listener' }, { onConflict: 'room_id,user_id' });
        }
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const userName = user.full_name || user.username || "Intercessor";
        const userAvatar = user.avatar_url || "";
        const res = await fetch(`/api/livekit/token?room=${roomId}&identity=${user.id}&name=${encodeURIComponent(userName)}&avatar=${encodeURIComponent(userAvatar)}`, {
          headers
        });

        if (!res.ok) throw new Error("Falha ao obter token");

        const { token: tk } = await res.json();
        setToken(tk);
      } catch (err) {
        console.error("Erro token:", err);
        toast.error("Erro sintonizando clamor. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [roomId, user?.id]);

  if (loading || !token) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0e0e0e] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-full border-4 border-[#3fff8b]/20 animate-spin border-t-[#3fff8b]" />
        <p className="text-[#3fff8b] font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Sintonizando Canal de Oração...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      options={{
        publishDefaults: {
          stopMicTrackOnMute: true,
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        }
      }}
      connectOptions={{ autoSubscribe: true }}
      className="fixed inset-0 z-[200] bg-[#0e0e0e] flex flex-col overflow-hidden"
    >
      <WarRoomInterface roomData={roomData} setRoomData={setRoomData} user={user} onExit={onExit} />
      <RoomAudioRenderer />
      <StartAudio 
        label="🔊 CLIQUE PARA OUVIR O CLAMOR" 
        className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center text-primary font-black uppercase tracking-[0.3em] text-sm hover:bg-black/90 transition-all cursor-pointer" 
      />
    </LiveKitRoom>
  );
}

function WarRoomInterface({ roomData, setRoomData, user, onExit }: { roomData: any; setRoomData: React.Dispatch<any>; user: any; onExit: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const { canPlayAudio, startAudio } = useAudioPlayback(room);
  
  const [chatInput, setChatInput] = useState("");
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const { messages, sendRoomMessage, chatEndRef } = useRoomChat(roomData.id, user.id);
  
  // Custom hooks
  const { myRole, setMyRole, dbParticipants, pendingRequests, setPendingRequests } = useWarRoomRealtime(roomData, user, localParticipant, onExit);
  const remainingTime = useWarRoomTimer(roomData, user.id, onExit);
  useMicrophoneControl(localParticipant, myRole);

  const [showModeration, setShowModeration] = useState(false);
  const [showMicTest, setShowMicTest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  const { send, message } = useDataChannel("reactions");

  useEffect(() => {
    if (message) {
      try {
        const msg = JSON.parse(new TextDecoder().decode(message.payload));
        if (msg.type === 'reaction') {
          handleAddReaction(msg.emoji, false);
        }
      } catch (e) {
        console.error("Erro ao processar reação:", e);
      }
    }
  }, [message]);

  function handleAddReaction(emoji: string, broadcast = true) {
    const id = Date.now();
    const xPos = Math.random() * 65 + 17;
    const xOffset = (Math.random() - 0.5) * 180;

    setReactions(prev => [...prev.slice(-12), {
      id,
      emoji,
      x: xPos,
      offset: xOffset
    }]);

    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 4200);

    if (broadcast && send) {
      send(
        new TextEncoder().encode(
          JSON.stringify({ type: 'reaction', emoji })
        ),
        { reliable: false }
      );
    }
  }




  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (content: string, file?: File) => {
    if (!content.trim() && !file) return;

    let media_url: string | undefined = undefined;
    if (file) {
      // --- SECURITY-REVIEW: Validação Estrita de Arquivos ---
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      if (file.size > maxSize) {
        toast.error("O arquivo é muito grande (Máximo 5MB).");
        return;
      }
      
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
      const extension = (file.name.toLowerCase().match(/\\.[^.]+$/) || [])[0];
      if (!extension || !allowedExtensions.includes(extension)) {
        toast.error(`Tipo de arquivo não permitido: ${extension || 'desconhecido'}`);
        return;
      }
      // ----------------------------------------------------

      const isImage = file.type.startsWith('image/');
      let contentType = file.type;
      let fileExt = extension.replace('.', '');
      
      let finalFile: Blob | File = file;
      if (isImage) {
        finalFile = await compressImage(file, 800, 0.6); // Chat super leve
        contentType = finalFile.type || 'image/webp';
        fileExt = (contentType.split('/')[1] || 'webp').replace('jpeg', 'jpg');
      }

      const fileName = `chat_${Date.now()}_${user.id}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('chat_media')
        .upload(fileName, finalFile, { cacheControl: '3600', upsert: false });
        
      if (error) {
        toast.error("Erro ao enviar arquivo");
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(data.path);
      media_url = publicUrl;
    }

    await sendRoomMessage(content, media_url);
    setChatInput("");
  };

  const approveReq = async (r: any) => {
    setPendingRequests(prev => prev.filter(req => req.id !== r.id));
    await supabase.from('requests').update({ status: 'approved' }).eq('id', r.id);
    await supabase.from('participants').upsert(
      { room_id: roomData.id, user_id: r.user_id, role: 'speaker' },
      { onConflict: 'room_id,user_id' }
    );
    toast.success("Intercessor aprovado! 🎤");
  };



  const creatorInLive = participants.find(p => p.identity === roomData?.creator_id) || (localParticipant?.identity === roomData?.creator_id ? localParticipant : null);
  const leaderMeta = JSON.parse(creatorInLive?.metadata || '{}');

  const handleLeaveSilently = () => {
    try {
      if (room) {
        room.disconnect();
      }
    } catch (e) {
      console.error("Erro ao desconectar LiveKit:", e);
    }
    onExit();
  };

  const handleEndRoom = async () => {
    try {
      if (room) {
        room.disconnect();
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Força o encerramento da sala no servidor LiveKit para não gerar custos se alguém ficar travado
      await fetch('/api/livekit/end-room', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roomId: roomData?.id })
      });
    } catch (e) {
      console.error("Erro ao desconectar LiveKit:", e);
    }

    await supabase.from('rooms').update({
      status: 'ended',
      ended_at: new Date().toISOString()
    }).eq('id', roomData?.id);
    
    toast.success("Sala de Guerra encerrada com sucesso! 🙏");
    onExit();
  };

  const handleCloseClick = () => {
    if (myRole === 'creator') {
      setShowEndConfirmation(true);
    } else {
      handleLeaveSilently();
    }
  };

  const activeParticipants = participants.filter(p => p.identity !== roomData?.creator_id);

  return (
    <div className="fixed inset-0 z-50 w-full flex flex-col overflow-hidden bg-[#0a0a0a] text-white font-body antialiased">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] w-full max-w-[280px] flex flex-col gap-4 pointer-events-none">
        {!canPlayAudio && (
          <button 
            onClick={() => { startAudio(); }} 
            className="p-6 bg-red-600/90 backdrop-blur-3xl border border-red-500/30 rounded-[2.5rem] flex flex-col items-center text-center gap-4 pointer-events-auto shadow-2xl animate-pulse group active:scale-95 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Mic size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white tracking-widest">Seu áudio está travado</p>
              <p className="text-[9px] font-bold text-white/70 uppercase mt-1">Toque aqui para ouvir o clamor</p>
            </div>
          </button>
        )}
        <AnimatePresence>
          {pendingRequests.map(req => (
            <motion.div key={req.id} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="p-6 bg-[#1a1a1a]/95 backdrop-blur-3xl border border-[#3fff8b]/30 rounded-[2.5rem] flex flex-col items-center text-center gap-4 pointer-events-auto shadow-2xl">
              <div className="w-16 h-16 rounded-full border-2 border-[#3fff8b] overflow-hidden bg-zinc-800 flex items-center justify-center">
                {req.profiles?.avatar_url ? (
                  <img src={req.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-white font-bold text-lg uppercase">
                    {(req.profiles?.full_name || "I")[0]}
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-white truncate max-w-[200px]">{req.profiles?.full_name}</p>
                <p className="text-[9px] font-bold text-[#3fff8b] uppercase tracking-widest mt-1">Quer interceder na sala</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => approveReq(req)} className="flex-1 py-3 bg-[#3fff8b] text-[#0e0e0e] rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Aprovar</button>
                <button onClick={async () => {
                  setPendingRequests(prev => prev.filter(p => p.id !== req.id));
                  await supabase.from('requests').update({ status: 'denied' }).eq('id', req.id);
                }} className="p-3 bg-white/5 text-red-500 rounded-full border border-red-500/10"><Ban size={18} /></button>
              </div>
      </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-6 pb-4 pt-[max(env(safe-area-inset-top),2rem)] z-20 w-full">
        <button onClick={handleLeaveSilently} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-headline font-extrabold text-sm tracking-tight uppercase text-center text-white">
            {roomData?.name || "Intercessão Sagrada"}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fff8b] animate-pulse" />
            <p className="text-[#3fff8b] text-[10px] font-bold tracking-widest uppercase">Ao Vivo</p>
            <div className="w-px h-2 bg-white/20 mx-0.5" />
            {roomData?.visibility === 'private' ? (
              <div className="flex items-center gap-1 text-orange-500">
                <Lock size={10} />
                <span className="text-[9px] font-black uppercase">Privada</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <Users size={10} />
                <span className="text-[9px] font-black uppercase">Pública</span>
              </div>
            )}
          </div>
        </div>
        <button onClick={handleCloseClick} className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10 transition-all active:scale-90 text-white">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center pt-2 px-6 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden">
          <AnimatePresence>
            {reactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ y: 100, opacity: 0, scale: 0.4 }}
                animate={{
                  y: -800,
                  x: [0, r.offset, 0],
                  opacity: [0, 1, 1, 0],
                  scale: [0.6, 1.8, 1.4, 0.8]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3.8, ease: "easeOut" }}
                className="absolute bottom-40 text-5xl drop-shadow-2xl pointer-events-none reaction-explosion"
                style={{ left: `${r.x}%`, filter: "drop-shadow(0 0 12px rgba(63, 255, 139, 0.6))" }}
              >
                {r.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-0 mb-1">
          <span className="font-headline font-extrabold text-4xl tracking-tighter text-white italic">
            {remainingTime || "00:00"}
          </span>
          <p className="font-label text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold">
            Tempo de Clamor
          </p>
        </div>

        <div className="relative w-full flex justify-center items-center mb-1">
          <div className="relative group">
            <div className="size-28 rounded-full border-4 border-[#3fff8b] avatar-glow flex items-center justify-center bg-[#0f0f0f] overflow-hidden relative z-10">
              {(() => {
                const avatar = (Array.isArray(roomData?.profiles) ? roomData.profiles[0]?.avatar_url : roomData?.profiles?.avatar_url) || leaderMeta?.avatar;
                if (avatar) {
                  return <img src={avatar} className="absolute inset-0 w-full h-full object-cover" alt="" />;
                }
                return <Flame size={56} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />;
              })()}
            </div>
            {creatorInLive?.isSpeaking && (
              <div className="absolute -inset-3 rounded-full border border-[#3fff8b]/20 animate-ping opacity-20" />
            )}
          </div>

          <div className="absolute right-4 flex flex-col gap-3">
            <button
              onClick={async () => {
                if (!localParticipant) return;
                const canSpeak = myRole === 'creator' || myRole === 'admin' || myRole === 'speaker';
                if (!canSpeak) { setShowMicTest(true); return; }
                try {
                  const newState = !localParticipant.isMicrophoneEnabled;
                  await localParticipant.setMicrophoneEnabled(newState);
                  toast.info(newState ? "🎤 Microfone ATIVADO" : "🔇 Microfone MUTADO");
                } catch (err) {
                  toast.error("Falha ao mudar microfone");
                }
              }}
              className={cn(
                "w-12 h-12 rounded-full glass-panel flex items-center justify-center border transition-all active:scale-95 text-xl",
                localParticipant?.isMicrophoneEnabled 
                  ? "border-[#3fff8b] bg-[#3fff8b] text-[#0e0e0e] shadow-lg shadow-[#3fff8b]/40" 
                  : "border-[#3fff8b]/30 bg-[#3fff8b]/10 text-[#3fff8b]"
              )}
            >
              {localParticipant?.isMicrophoneEnabled ? <Mic size={20} /> : (myRole === 'listener' ? <Mic size={20} /> : <MicOff size={20} />)}
            </button>
            {myRole === 'creator' || myRole === 'admin' || myRole === 'speaker' ? (
              <button 
                onClick={() => setShowMicTest(true)} 
                className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border border-[#3fff8b]/30 bg-[#3fff8b]/10 text-[#3fff8b] transition-all active:scale-95"
              >
                <Headphones size={20} />
              </button>
            ) : (
              <button 
                onClick={async () => { setRequestStatus('pending'); await supabase.from('requests').insert({ room_id: roomData.id, user_id: user.id, status: 'pending' }); toast.info("Pedido enviado"); }} 
                className={cn(
                  "w-12 h-12 rounded-full glass-panel flex items-center justify-center border border-[#3fff8b]/30 bg-[#3fff8b]/10 text-[#3fff8b] transition-all", 
                  requestStatus === 'pending' && "bg-[#3fff8b]/40 animate-pulse border-[#3fff8b]"
                )}
              >
                <Hand size={20} />
              </button>
            )}
            <button onClick={() => setShowModeration(true)} className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border border-[#3fff8b]/30 bg-[#3fff8b]/10 hover:bg-[#3fff8b]/20 active:scale-95 transition-all text-[#3fff8b] relative">
              <Users size={20} />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0e0e0e] flex items-center justify-center">
                  <span className="relative text-[8px] font-black text-white">{pendingRequests.length}</span>
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                const shareData = {
                  title: roomData?.name || "War Room FéConecta",
                  text: `Venha participar deste clamor conosco! 🙏 ${roomData?.name || ''}`,
                  url: window.location.href,
                };
                if (navigator.share) {
                  navigator.share(shareData).catch(console.error);
                } else {
                  navigator.clipboard.writeText(shareData.url);
                  toast.success("Link de intercessão copiado! 🙏");
                }
              }}
              className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border border-[#3fff8b]/30 bg-[#3fff8b]/10 hover:bg-[#3fff8b]/20 active:scale-95 transition-all text-[#3fff8b]"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-center gap-1.5 h-8 mb-6">
          {[...Array(9)].map((_, i) => (
            <motion.div key={i} animate={{ height: creatorInLive?.isSpeaking ? [8, 12 + Math.random() * 16, 8] : [8, 10, 8] }} transition={{ repeat: Infinity, duration: 0.4 + (i * 0.1) }} className="w-1.5 bg-[#3fff8b] rounded-full shadow-[0_0_10px_#3fff8b]" />
          ))}
        </div>

        <div className="flex items-center justify-center -space-x-3 mb-2">
          {activeParticipants.slice(0, 3).map((p, i) => {
            const meta = JSON.parse(p.metadata || '{}');
            return (
              <div key={i} className="relative transition-all opacity-100 saturate-150">
                <div className="w-12 h-12 rounded-full border-2 border-[#3fff8b] avatar-glow overflow-hidden bg-zinc-800 flex items-center justify-center shadow-xl">
                  {meta.avatar ? (
                    <img
                      src={meta.avatar}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <span className="text-white font-bold text-xs uppercase">
                      {(p.name || "P")[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {activeParticipants.length > 3 && (
            <div className="w-12 h-12 rounded-full border-2 border-[#0e0e0e] bg-[#1a1a1a] flex items-center justify-center relative z-10">
              <span className="text-[#3fff8b] text-xs font-bold">+{activeParticipants.length - 3}</span>
            </div>
          )}
          {activeParticipants.length === 0 && (
            <div className="flex flex-col items-center opacity-30">
               <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Sala Ativa</span>
            </div>
          )}
        </div>

        <div className="w-full max-w-[320px] flex flex-col gap-1.5 mb-1 shrink-0">
          <div className="flex gap-3">
            <button onClick={() => { handleAddReaction("🙏"); handleSendMessage("Amém! 🙏"); }} className="primary-gradient flex-1 h-12 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all">
              <span className="font-headline font-extrabold text-[#0e0e0e] text-xs tracking-widest uppercase italic">Amém</span>
            </button>
            <button onClick={() => { handleAddReaction("🙌"); handleSendMessage("Glória! 🙌"); }} className="primary-gradient flex-1 h-12 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all">
              <span className="font-headline font-extrabold text-[#0e0e0e] text-xs tracking-widest uppercase italic">Glória</span>
            </button>
          </div>
          <div className="flex justify-between px-4">
            {["🙏", "👏", "🔥", "❤️"].map((e) => (
              <button key={e} onClick={() => { handleAddReaction(e); handleSendMessage(e); }} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center border border-white/5 active:scale-90 transition-all text-xl">{e}</button>
            ))}
          </div>
        </div>

        <div className="w-full flex-1 overflow-y-auto chat-mask space-y-4 pb-4 px-2 no-scrollbar">
          {messages.slice(-8).map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-zinc-800 flex items-center justify-center">
                {m.avatar_url ? (
                  <img src={m.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-white font-bold text-[10px] uppercase">
                    {(m.user_name || "I")[0]}
                  </span>
                )}
              </div>
              <div className="flex-1 group/msg relative">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[11px] font-bold text-[#3fff8b]/80">{m.user_name}</p>
                  {(myRole === 'creator' || myRole === 'admin') && (
                    <button onClick={async () => { await supabase.from('messages').delete().eq('id', m.id); }} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 hover:text-red-500 rounded text-white/30"><Trash2 size={10} /></button>
                  )}
                </div>
                <p className="text-xs text-white font-medium leading-relaxed bg-[#0f0f0f] p-3 rounded-r-2xl rounded-bl-2xl border border-white/5">
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} className="h-4" />
        </div>
      </div>

      <div className="w-full px-6 pt-4 pb-[env(safe-area-inset-bottom,1.5rem)] bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e] to-transparent border-t border-white/5 z-[110]">
        <div className="relative flex items-center gap-2">
          <button onClick={() => setShowChatOverlay(true)} className="md:hidden w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#3fff8b] transition-colors"><Users size={18} /></button>
          <input 
            type="file" 
            id="desktop-chat-file"
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSendMessage("", file);
            }}
          />
          <button 
            onClick={() => document.getElementById('desktop-chat-file')?.click()}
            className="hidden md:flex w-11 h-11 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white/40 hover:text-[#3fff8b] transition-colors active:scale-90"
          >
            <Paperclip size={18} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && chatInput.trim()) handleSendMessage(chatInput); }}
              placeholder="Envie sua intercessão..."
              className="w-full bg-[#0f0f0f] border border-white/10 rounded-full py-3.5 px-5 text-sm focus:ring-1 focus:ring-[#3fff8b]/50 placeholder:text-white/20 outline-none text-white"
            />
            <button onClick={() => { if (chatInput.trim()) handleSendMessage(chatInput); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#3fff8b]/10 flex items-center justify-center hover:bg-[#3fff8b]/20 transition-colors active:scale-95"><Send size={18} className="text-[#3fff8b]" /></button>
          </div>
        </div>
      </div>

      <MicCheckModal show={showMicTest} onClose={() => setShowMicTest(false)} />
      <ChatOverlay show={showChatOverlay} onClose={() => setShowChatOverlay(false)} messages={messages} onSendMessage={handleSendMessage} myRole={myRole} />
      <WarRoomSettings
        show={showModeration}
        onClose={() => setShowModeration(false)}
        roomId={roomData.id}
        dbParticipants={dbParticipants}
        liveParticipants={participants}
        myRole={myRole}
        pendingRequests={pendingRequests}
        onApprove={approveReq}
        onDeny={async (id) => {
          setPendingRequests(prev => prev.filter(p => p.id !== id));
          await supabase.from('requests').update({ status: 'denied' }).eq('id', id);
        }}
        showChatOverlay={showChatOverlay}
        onToggleChatOverlay={() => setShowChatOverlay(!showChatOverlay)}
        localParticipant={localParticipant}
      />

      {showEndConfirmation && (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#131313] rounded-[2rem] p-8 flex flex-col items-center gap-6 border border-white/5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <PhoneOff size={28} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg mb-2 uppercase tracking-widest">Encerrar Sala?</h3>
              <p className="text-white/60 text-xs font-medium">Você é o criador desta sala. O que deseja fazer?</p>
            </div>
            <div className="flex flex-col gap-3 w-full mt-2">
              <button 
                onClick={handleEndRoom} 
                className="w-full py-4 bg-red-500 text-white rounded-full font-black text-[12px] uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 transition-all"
              >
                Encerrar para Todos
              </button>
              <button 
                onClick={handleLeaveSilently} 
                className="w-full py-4 bg-[#3fff8b]/10 text-[#3fff8b] border border-[#3fff8b]/30 rounded-full font-black text-[12px] uppercase tracking-widest hover:bg-[#3fff8b]/20 active:scale-95 transition-all"
              >
                Sair (Manter Aberta)
              </button>
              <button 
                onClick={() => setShowEndConfirmation(false)} 
                className="w-full py-4 bg-transparent text-white/40 rounded-full font-bold text-[12px] uppercase tracking-widest hover:text-white transition-all mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
