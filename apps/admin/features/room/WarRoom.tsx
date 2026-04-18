"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, Mic, MicOff, Send, ArrowLeft, Hand, UserPlus, Clock as ClockIcon, Search, PhoneOff, Check, Ban, Headphones, VolumeX, Users, Trash2, ShieldAlert, ShieldOff, Link, Share2, Paperclip
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
      if (isCreator) {
        await supabase.from('participants').upsert({ room_id: roomId, user_id: user.id, role: 'creator' }, { onConflict: 'room_id,user_id' });
      } else {
        await supabase.from('participants').upsert({ room_id: roomId, user_id: user.id, role: 'listener' }, { onConflict: 'room_id,user_id' });
      }

      try {
        const userName = user.full_name || user.username || "Intercessor";
        const userAvatar = user.avatar_url || "";
        const res = await fetch(`/api/livekit/token?room=${roomId}&identity=${user.id}&name=${encodeURIComponent(userName)}&avatar=${encodeURIComponent(userAvatar)}`);

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
          audioPreset: 'speech',
          stopMicTrackOnMute: true,
        }
      }}
      connectOptions={{ autoSubscribe: true }}
      className="fixed inset-0 z-[100] bg-[#0e0e0e] flex flex-col overflow-hidden"
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [remainingTime, setRemainingTime] = useState("");
  const [myRole, setMyRole] = useState<'creator' | 'admin' | 'listener' | 'speaker' | 'none'>(roomData?.creator_id === user?.id ? 'creator' : 'none');
  const [showModeration, setShowModeration] = useState(false);
  const [showMicTest, setShowMicTest] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [showChatOverlay, setShowChatOverlay] = useState(false);

  const [dbParticipants, setDbParticipants] = useState<any[]>([]);
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const tailScript = document.createElement("script");
    tailScript.src = "https://cdn.tailwindcss.com?plugins=forms,container-queries";
    tailScript.onload = () => {
      // @ts-ignore
      if (window.tailwind) {
        // @ts-ignore
        window.tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              colors: {
                "surface-container-highest": "var(--war-surface-high, #201f1f)",
                "surface-container-high": "var(--war-surface-high, #201f1f)",
                "surface-container-low": "var(--war-surface-low, #131313)",
                "surface": "var(--war-surface, #0e0e0e)",
                "background": "var(--war-bg, #0a0a0a)",
                "primary": "#3fff8b",
                "on-surface": "var(--war-text, #ffffff)",
                "on-surface-variant": "var(--war-text-dim, #adaaaa)",
              },
              borderRadius: { DEFAULT: "1rem", lg: "2rem", xl: "3rem", full: "9999px" },
              fontFamily: { headline: ["Plus Jakarta Sans"], body: ["Manrope"] }
            }
          }
        };
      }
    };
    document.head.appendChild(tailScript);

    const style = document.createElement("style");
    style.innerHTML = `
      :root {
        --war-bg: #0a0a0a;
        --war-surface: #0e0e0e;
        --war-surface-low: #0f0f0f;
        --war-surface-high: #1a1a1a;
        --war-text: #ffffff;
        --war-text-dim: #adaaaa;
        --war-glass: rgba(18, 18, 18, 0.8);
      }
      .emerald-glow { box-shadow: 0 0 40px 0 rgba(63, 255, 139, 0.12); }
      .avatar-glow { box-shadow: 0 0 12px 0 rgba(63, 255, 139, 0.4); }
      .glass-panel { background: var(--glass); backdrop-filter: blur(20px); }
      .primary-gradient { background: linear-gradient(135deg, #3fff8b 0%, #13ea79 100%); }
      .chat-mask {
        mask-image: linear-gradient(to top, black 85%, transparent 100%);
        -webkit-mask-image: linear-gradient(to top, black 85%, transparent 100%);
      }
      .reaction-explosion {
        text-shadow: 
          0 0 20px rgba(63, 255, 139, 0.8),
          0 0 40px rgba(63, 255, 139, 0.4);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(fontLink);
      document.head.removeChild(tailScript);
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (!roomData?.id) return;
    const isLeader = roomData.creator_id === user.id;

    const setupUserRole = async () => {
      if (!roomData?.id) return;

      if (isLeader) {
        await supabase.from('participants').upsert(
          { room_id: roomData.id, user_id: user.id, role: 'creator' },
          { onConflict: 'room_id,user_id' }
        );
        setMyRole('creator');
      } else {
        const { data: p } = await supabase.from('participants')
          .select('role')
          .eq('room_id', roomData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (p) {
          setMyRole(p.role as any);
        } else {
          await supabase.from('participants').insert({
            room_id: roomData.id,
            user_id: user.id,
            role: 'listener'
          });
          setMyRole('listener');
        }
      }

      if (isLeader) {
        const { data: reqs } = await supabase.from('requests')
          .select('*, profiles:user_id(full_name, avatar_url)')
          .eq('room_id', roomData.id)
          .eq('status', 'pending');
        if (reqs) setPendingRequests(reqs);
      }
    };
    setupUserRole();

    const fetchDBMembers = async () => {
      const { data } = await supabase.from('participants').select('*, profiles(*)').eq('room_id', roomData.id);
      if (data) {
        setDbParticipants(data);
        const me = data.find(p => p.user_id === user.id);
        if (me) setMyRole(me.role as any);
      }
    };
    fetchDBMembers();

    const tInterval = setInterval(async () => {
      const end = moment(roomData.created_at).add(roomData.duration_minutes || 60, 'minutes');
      const diff = end.diff(moment());

      if (diff <= 0) {
        setRemainingTime("00:00");
        clearInterval(tInterval);

        if (roomData.creator_id === user.id && roomData.status !== 'ended') {
          await supabase.from('rooms').update({
            status: 'ended',
            ended_at: new Date().toISOString()
          }).eq('id', roomData.id);
          
          toast.error("O tempo do clamor acabou! 🙏");
          setTimeout(() => onExit(), 1500);
        } else if (roomData.status === 'ended') {
          toast.error("O tempo do clamor acabou! 🙏");
          setTimeout(() => onExit(), 1500);
        }
        return;
      }

      const dur = moment.duration(diff);
      setRemainingTime(`${Math.floor(dur.asMinutes())}:${dur.seconds() < 10 ? '0' : ''}${dur.seconds()}`);
    }, 1000);

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: true })
        .limit(20);

      if (data) {
        setMessages(data.map(m => {
          const profile = Array.isArray((m as any).profiles) ? (m as any).profiles[0] : (m as any).profiles;
          return {
            ...m,
            user_name: profile?.full_name || 'Intercessor',
            avatar_url: profile?.avatar_url
          };
        }));
      }
    };
    fetchMessages();

    const sc = supabase.channel(`war-room-v3-${roomData.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomData.id}` }, (p) => {
        if (p.new.status === 'ended') {
          setRoomData((prev: any) => ({ ...prev, ...p.new }));
          toast.info("A sala foi encerrada.");
          setTimeout(() => onExit(), 1000);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomData.id}` }, fetchDBMembers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `room_id=eq.${roomData.id}` }, async (p) => {
        if (isLeader) {
          if (p.eventType === 'INSERT') {
            const { data } = await supabase.from('profiles').select('*').eq('id', (p.new as any).user_id).single();
            setPendingRequests(prev => [...prev, { ...(p.new as any), profiles: data }]);
          } else {
            setPendingRequests(prev => prev.filter(r => r.id !== (p.new as any).id));
          }
        }
        if ((p.new as any).user_id === user.id && (p.new as any).status === 'approved') {
          setMyRole('speaker');
          toast.success("Seu microfone foi liberado! 🎤");

          setTimeout(async () => {
            if (localParticipant) {
              try {
                await localParticipant.setMicrophoneEnabled(true);
              } catch (e) {
                console.error("Erro na ativação pós-aprovação:", e);
              }
            }
          }, 600);
        }
      }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomData.id}` }, async (p) => {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', (p.new as any).user_id).single();
        const msg = { ...(p.new as any), user_name: data?.full_name || 'Intercessor', avatar_url: data?.avatar_url };
        setMessages(prev => [...prev, msg]);
      }).subscribe();

    return () => { clearInterval(tInterval); supabase.removeChannel(sc); };
  }, [roomData?.id, user.id, roomData?.creator_id, roomData?.created_at, roomData?.duration_minutes]);

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (content: string, file?: File) => {
    if (!content.trim() && !file) return;

    let media_url = null;
    if (file) {
      const isImage = file.type.startsWith('image/');
      const fileExt = file.name?.split('.').pop() || (isImage ? 'jpg' : file.type.split('/')[1]) || 'bin';
      const fileName = `chat_${Date.now()}_${user.id}.${fileExt}`;
      
      let finalFile: Blob | File = file;
      if (isImage) {
        finalFile = await compressImage(file, 800, 0.6); // Chat pode ser ainda mais leve
      }

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, finalFile, { contentType: file.type });
        
      if (uploadError) {
        toast.error("Erro ao enviar arquivo");
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path);
      media_url = publicUrl;
    }

    await supabase.from('messages').insert({ 
      room_id: roomData.id, 
      user_id: user.id, 
      content,
      media_url 
    });
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

  useEffect(() => {
    if (!localParticipant) return;
    const canSpeak = myRole === 'creator' || myRole === 'admin' || myRole === 'speaker';

    const enableMic = async () => {
      try {
        if (canSpeak) {
          // Handshake Robusto: Esperamos o participante local estar 'joined'
          let retry = 0;
          while (!localParticipant.isMicrophoneEnabled && retry < 5) {
            await localParticipant.setMicrophoneEnabled(true);
            if (localParticipant.isMicrophoneEnabled) break;
            await new Promise(r => setTimeout(r, 800));
            retry++;
          }
        } else {
          await localParticipant.setMicrophoneEnabled(false);
        }
      } catch (err: any) {
        console.error("❌ Erro ao controlar microfone:", err);
      }
    };
    enableMic();
  }, [myRole, localParticipant]);

  const creatorInLive = participants.find(p => p.identity === roomData?.creator_id) || (localParticipant?.identity === roomData?.creator_id ? localParticipant : null);
  const leaderMeta = JSON.parse(creatorInLive?.metadata || '{}');

  const handleExit = async () => {
    try {
      if (room) {
        room.disconnect();
      }
    } catch (e) {
      console.error("Erro ao desconectar LiveKit:", e);
    }

    if (myRole === 'creator') {
      await supabase.from('rooms').update({
        status: 'ended',
        ended_at: new Date().toISOString()
      }).eq('id', roomData?.id);
      
      toast.success("Sala de Guerra encerrada com sucesso! 🙏");
    }

    onExit();
  };

  const activeParticipants = participants.filter(p => p.identity !== roomData?.creator_id);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] text-white font-body antialiased">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] w-full max-w-[280px] flex flex-col gap-4 pointer-events-none">
        {!canPlayAudio && (
          <button 
            onClick={() => { startAudio(); }} 
            className="p-6 bg-red-600/90 backdrop-blur-3xl border border-red-500/30 rounded-[2.5rem] flex flex-col items-center text-center gap-4 pointer-events-auto shadow-2xl animate-pulse group active:scale-95 transition-all"
          >
            <div className="size-12 rounded-full bg-white/10 flex items-center justify-center">
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
              <img src={req.profiles?.avatar_url || "https://github.com/shadcn.png"} className="w-16 h-16 rounded-full border-2 border-[#3fff8b] object-cover" alt="" />
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

      <div className="flex items-center justify-between px-6 py-4 z-20">
        <button onClick={handleExit} className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-headline font-extrabold text-sm tracking-tight uppercase text-center text-white">
            {roomData?.name || "Intercessão Sagrada"}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="size-1.5 rounded-full bg-[#3fff8b] animate-pulse" />
            <p className="text-[#3fff8b] text-[10px] font-bold tracking-widest uppercase">Ao Vivo</p>
          </div>
        </div>
        <button onClick={handleExit} className="flex items-center justify-center size-11 rounded-full hover:bg-white/10 transition-all active:scale-90 text-white">
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

        <div className="flex flex-col items-center gap-0.5 mb-2">
          <span className="font-headline font-extrabold text-5xl tracking-tighter text-white italic">
            {remainingTime || "00:00"}
          </span>
          <p className="font-label text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold">
            Tempo de Clamor
          </p>
        </div>

        <div className="relative w-full flex justify-center items-center mb-2">
          <div className="relative group">
            <div className="size-32 rounded-full border-4 border-[#3fff8b] avatar-glow flex items-center justify-center bg-[#0f0f0f] overflow-hidden relative z-10">
              <img
                src={(Array.isArray(roomData?.profiles) ? roomData.profiles[0]?.avatar_url : roomData?.profiles?.avatar_url) || leaderMeta.avatar || "https://github.com/shadcn.png"}
                className="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
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
                "size-12 rounded-full glass-panel flex items-center justify-center border transition-all active:scale-95 text-xl",
                localParticipant?.isMicrophoneEnabled 
                  ? "border-[#3fff8b] bg-[#3fff8b] text-[#0e0e0e] shadow-lg shadow-[#3fff8b]/40" 
                  : "border-[#3fff8b]/30 bg-[#3fff8b]/10 text-[#3fff8b]"
              )}
            >
              {localParticipant?.isMicrophoneEnabled ? <Mic size={20} /> : (myRole === 'listener' ? <Mic size={20} /> : <MicOff size={20} />)}
            </button>
            <button 
              onClick={async () => { setRequestStatus('pending'); await supabase.from('requests').insert({ room_id: roomData.id, user_id: user.id, status: 'pending' }); toast.info("Pedido enviado"); }} 
              className={cn(
                "size-12 rounded-full glass-panel flex items-center justify-center border border-[#3fff8b]/30 bg-[#3fff8b]/10 text-[#3fff8b] transition-all", 
                requestStatus === 'pending' && "bg-[#3fff8b]/40 animate-pulse border-[#3fff8b]"
              )}
            >
              <Hand size={20} />
            </button>
            <button onClick={() => setShowModeration(true)} className="size-12 rounded-full glass-panel flex items-center justify-center border border-[#3fff8b]/30 bg-[#3fff8b]/10 hover:bg-[#3fff8b]/20 active:scale-95 transition-all text-[#3fff8b] relative">
              <Users size={20} />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-[#0e0e0e] flex items-center justify-center">
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
              className="size-12 rounded-full glass-panel flex items-center justify-center border border-[#3fff8b]/30 bg-[#3fff8b]/10 hover:bg-[#3fff8b]/20 active:scale-95 transition-all text-[#3fff8b]"
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
                <img
                  src={meta.avatar || "https://github.com/shadcn.png"}
                  className="size-12 rounded-full border-2 border-[#3fff8b] avatar-glow object-cover shadow-xl"
                  alt=""
                />
              </div>
            );
          })}
          {activeParticipants.length > 3 && (
            <div className="size-12 rounded-full border-2 border-[#0e0e0e] bg-[#1a1a1a] flex items-center justify-center relative z-10">
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
              <button key={e} onClick={() => { handleAddReaction(e); handleSendMessage(e); }} className="size-10 rounded-full glass-panel flex items-center justify-center border border-white/5 active:scale-90 transition-all text-xl">{e}</button>
            ))}
          </div>
        </div>

        <div className="w-full flex-1 overflow-y-auto chat-mask space-y-4 pb-4 px-2 no-scrollbar">
          {messages.slice(-8).map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-cover bg-center flex-shrink-0 border border-white/10" style={{ backgroundImage: `url(${m.avatar_url || 'https://github.com/shadcn.png'})` }} />
              <div className="flex-1 group/msg relative">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[11px] font-bold text-[#3fff8b]/80">{m.user_name}</p>
                  {(myRole === 'creator' || myRole === 'admin') && (
                    <button onClick={async () => { await supabase.from('messages').delete().eq('id', m.id); setMessages(prev => prev.filter(msg => msg.id !== m.id)); }} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 hover:text-red-500 rounded text-white/30"><Trash2 size={10} /></button>
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

      <div className="w-full px-6 pt-4 pb-24 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e] to-transparent border-t border-white/5 z-[110]">
        <div className="relative flex items-center gap-2">
          <button onClick={() => setShowChatOverlay(true)} className="md:hidden size-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#3fff8b] transition-colors"><Users size={18} /></button>
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
            className="hidden md:flex size-11 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white/40 hover:text-[#3fff8b] transition-colors active:scale-90"
          >
            <Paperclip size={18} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onFocus={() => { if (window.innerWidth < 768) setShowChatOverlay(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && chatInput.trim()) handleSendMessage(chatInput); }}
              placeholder="Envie sua intercessão..."
              className="w-full bg-[#0f0f0f] border border-white/10 rounded-full py-3.5 px-5 text-sm focus:ring-1 focus:ring-[#3fff8b]/50 placeholder:text-white/20 outline-none text-white"
            />
            <button onClick={() => { if (chatInput.trim()) handleSendMessage(chatInput); }} className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-[#3fff8b]/10 flex items-center justify-center hover:bg-[#3fff8b]/20 transition-colors active:scale-95"><Send size={18} className="text-[#3fff8b]" /></button>
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
    </div>
  );
}
