"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, Mic, MicOff, Send, ArrowLeft, Hand, UserPlus, Clock as ClockIcon, Search, PhoneOff, Check, Ban, Headphones, VolumeX, Users, Trash2, ShieldAlert, ShieldOff, Link
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
} from "@livekit/components-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

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

export function WarRoom({ roomId, user, onExit }: WarRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: room, error: roomError } = await supabase.from('rooms').select('*, profiles:creator_id(full_name, avatar_url)').eq('id', roomId).single();
      if (roomError || !room) { toast.error("Sala não encontrada"); onExit(); return; }
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
        // Não chamamos onExit aqui para permitir retry manual ou apenas ficar no loading
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
      audio={roomData?.creator_id === user?.id}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connectOptions={{ autoSubscribe: true }}
      className="fixed inset-0 z-[100] bg-[#0e0e0e] flex flex-col overflow-hidden"
    >
      <RoomAudioRenderer />
      <WarRoomInterface roomData={roomData} setRoomData={setRoomData} user={user} onExit={onExit} />
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
    const xPos = Math.random() * 65 + 17;        // centralizado (15% a 82%)
    const xOffset = (Math.random() - 0.5) * 180; // variação lateral mais suave

    setReactions(prev => [...prev.slice(-12), {
      id,
      emoji,
      x: xPos,
      offset: xOffset
    }]);

    // Remove automaticamente após 4 segundos
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 4200);

    // Envia para outros usuários via LiveKit DataChannel
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
      .light {
        --war-bg: #efeae2;
        --war-surface: #ffffff;
        --war-surface-low: #ffffff;
        --war-surface-high: #d1d7db;
        --war-text: #111b21;
        --war-text-dim: #667781;
        --war-glass: rgba(255, 255, 255, 0.9);
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

      // 1. Garante que o criador sempre tenha o cargo de 'creator' no banco
      if (isLeader) {
        await supabase.from('participants').upsert(
          { room_id: roomData.id, user_id: user.id, role: 'creator' },
          { onConflict: 'room_id,user_id' }
        );
        setMyRole('creator');
      } else {
        // 2. Busca se o usuário já tem um cargo salvo (Admin, Listener, etc)
        const { data: p } = await supabase.from('participants')
          .select('role')
          .eq('room_id', roomData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (p) {
          setMyRole(p.role as any);
        } else {
          // 3. Se for a primeira vez e não tiver cargo, entra como listener
          await supabase.from('participants').insert({
            room_id: roomData.id,
            user_id: user.id,
            role: 'listener'
          });
          setMyRole('listener');
        }
      }

      // 4. Se for líder, busca pedidos pendentes
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
          toast.success("Seu microfone foi liberado! 🎤", {
            description: "Clique no microfone para começar a interceder.",
          });
        }
      }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomData.id}` }, async (p) => {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', (p.new as any).user_id).single();
        const msg = { ...(p.new as any), user_name: data?.full_name || 'Intercessor', avatar_url: data?.avatar_url };
        setMessages(prev => [...prev, msg]);
      }).subscribe();

    return () => { clearInterval(tInterval); supabase.removeChannel(sc); };
  }, [roomData?.id, user.id, roomData?.creator_id, roomData?.created_at, roomData?.duration_minutes]);

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    await supabase.from('messages').insert({ room_id: roomData.id, user_id: user.id, content });
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

    const syncMic = async () => {
      try {
        if (!canSpeak && localParticipant.isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(false);
        } else if (canSpeak && (myRole === 'creator' || myRole === 'admin') && !localParticipant.isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(true);
        }
      } catch (err) {
        console.error("Erro ao configurar microfone:", err);
        toast.error("Não foi possível acessar o microfone.");
      }
    };
    syncMic();
  }, [myRole, localParticipant]);

  const creatorInLive = participants.find(p => p.identity === roomData.creator_id) || (localParticipant.identity === roomData.creator_id ? localParticipant : null);
  const leaderMeta = JSON.parse(creatorInLive?.metadata || '{}');

  const handleExit = () => {
    if (myRole === 'creator') {
      toast("Deseja encerrar o clamor para todos?", {
        description: "Isso encerrará a conexão de todos os participantes.",
        action: {
          label: "Encerrar",
          onClick: async () => {
            try {
              room.disconnect();
            } catch (e) {}

            await supabase.from('rooms').update({
              status: 'ended',
              ended_at: new Date().toISOString()
            }).eq('id', roomData.id);
            onExit();
          },
        },
      });
    } else {
      try { room.disconnect(); } catch (e) {}
      onExit();
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background text-on-surface font-body antialiased">

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
        <button onClick={handleExit} className="flex items-center justify-center size-10 rounded-full hover:bg-surface-container-high transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-headline font-extrabold text-sm tracking-tight uppercase text-center">
            {roomData?.name || "Intercessão Sagrada"}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="size-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-primary text-[10px] font-bold tracking-widest uppercase">Ao Vivo</p>
          </div>
        </div>
        <button onClick={handleExit} className="flex items-center justify-center size-11 rounded-full hover:bg-surface-container-highest transition-all active:scale-90">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center pt-2 px-6 overflow-hidden relative">
        {/* Floating Reactions Explosion Layer */}
        <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden">
          <AnimatePresence>
            {reactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{
                  y: 100,
                  opacity: 0,
                  scale: 0.4
                }}
                animate={{
                  y: -window.innerHeight * 0.75,
                  x: [0, r.offset, 0],
                  opacity: [0, 1, 1, 0],
                  scale: [0.6, 1.8, 1.4, 0.8]
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 3.8,
                  ease: "easeOut"
                }}
                className="absolute bottom-40 text-5xl drop-shadow-2xl pointer-events-none reaction-explosion"
                style={{
                  left: `${r.x}%`,
                  filter: "drop-shadow(0 0 12px rgba(63, 255, 139, 0.6))"
                }}
              >
                {r.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-0.5 mb-2">
          <span className="font-headline font-extrabold text-5xl tracking-tighter text-on-surface italic">
            {remainingTime || "00:00"}
          </span>
          <p className="font-label text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-semibold">
            Tempo de Clamor
          </p>
        </div>

        <div className="relative w-full flex justify-center items-center mb-2">
          <div className="relative group">
            <div className="size-32 rounded-full border-4 border-primary avatar-glow flex items-center justify-center bg-surface-container-low overflow-hidden relative z-10">
              <img
                src={(Array.isArray(roomData?.profiles) ? roomData.profiles[0]?.avatar_url : roomData?.profiles?.avatar_url) || leaderMeta.avatar || "https://github.com/shadcn.png"}
                className="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
            </div>
            {creatorInLive?.isSpeaking && (
              <div className="absolute -inset-3 rounded-full border border-primary/20 animate-ping opacity-20" />
            )}
          </div>

          <div className="absolute right-4 flex flex-col gap-3">
            <button
              onClick={() => {
                const canSpeak = myRole === 'creator' || myRole === 'admin' || myRole === 'speaker';
                if (canSpeak) {
                  localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
                } else {
                  setShowMicTest(true);
                }
              }}
              className={cn(
                "size-12 rounded-full glass-panel flex items-center justify-center border transition-all active:scale-95",
                localParticipant.isMicrophoneEnabled ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20" : "border-white/10 hover:bg-surface-container-highest"
              )}
              title={myRole === 'listener' ? "Testar Microfone" : (localParticipant.isMicrophoneEnabled ? "Mutar" : "Ativar Microfone")}
            >
              {localParticipant.isMicrophoneEnabled ? <Mic size={20} /> : (myRole === 'listener' ? <Mic size={20} /> : <MicOff size={20} />)}
            </button>
            <button onClick={async () => { setRequestStatus('pending'); await supabase.from('requests').insert({ room_id: roomData.id, user_id: user.id, status: 'pending' }); toast.info("Pedido enviado"); }} className={cn("size-12 rounded-full glass-panel flex items-center justify-center border border-white/10 transition-all", requestStatus === 'pending' && "bg-primary/20 border-primary animate-pulse")}>
              <Hand size={20} />
            </button>
            <button
              onClick={() => setShowModeration(true)}
              className="size-12 rounded-full glass-panel flex items-center justify-center border border-primary/30 bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all text-primary shadow-lg shadow-primary/20 relative"
              title="Gestão da Sala"
            >
              <Users size={20} />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-[#0e0e0e] flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative text-[8px] font-black text-white">{pendingRequests.length}</span>
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-end justify-center gap-1.5 h-8 mb-6">
          {[...Array(9)].map((_, i) => (
            <motion.div key={i} animate={{ height: creatorInLive?.isSpeaking ? [8, 12 + Math.random() * 16, 8] : [8, 10, 8] }} transition={{ repeat: Infinity, duration: 0.4 + (i * 0.1) }} className="w-1.5 bg-primary rounded-full shadow-[0_0_10px_#3fff8b]" />
          ))}
        </div>

        {/* Participants Avatars (DB Synced) */}
        <div className="flex items-center justify-center -space-x-3 mb-2">
          {dbParticipants.slice(0, 3).map((p, i) => {
            const isOnline = participants.some(lp => lp.identity?.toString() === p.user_id?.toString()) || localParticipant.identity?.toString() === p.user_id?.toString();
            return (
              <div key={i} className={cn("relative transition-all", !isOnline ? "opacity-40 grayscale" : "opacity-100 saturate-150")}>
                <img
                  src={(Array.isArray(p.profiles) ? p.profiles[0]?.avatar_url : p.profiles?.avatar_url) || "https://github.com/shadcn.png"}
                  className={cn("size-12 rounded-full border-2 object-cover shadow-xl", isOnline ? "border-primary avatar-glow" : "border-white/10")}
                  alt=""
                />
              </div>
            );
          })}
          <div className="size-12 rounded-full border-2 border-surface bg-surface-container-highest flex items-center justify-center">
            <span className="text-primary text-xs font-bold">+{Math.max(0, dbParticipants.length - 3)}</span>
          </div>
        </div>

        <div className="w-full max-w-[320px] flex flex-col gap-1.5 mb-1 shrink-0">
          <div className="flex gap-3">
            <button onClick={() => { handleAddReaction("🙏"); handleSendMessage("Amém! 🙏"); }} className="primary-gradient flex-1 h-12 rounded-full flex items-center justify-center emerald-glow shadow-xl active:scale-95 transition-all">
              <span className="font-headline font-extrabold text-[#0e0e0e] text-xs tracking-widest uppercase italic">Amém</span>
            </button>
            <button onClick={() => { handleAddReaction("🙌"); handleSendMessage("Glória! 🙌"); }} className="primary-gradient flex-1 h-12 rounded-full flex items-center justify-center emerald-glow shadow-xl active:scale-95 transition-all">
              <span className="font-headline font-extrabold text-[#0e0e0e] text-xs tracking-widest uppercase italic">Glória</span>
            </button>
          </div>
          <div className="flex justify-between px-4">
            {["🙏", "👏", "🔥", "❤️"].map((e) => (
              <button key={e} onClick={() => { handleAddReaction(e); handleSendMessage(e); }} className="size-10 rounded-full glass-panel flex items-center justify-center border border-white/5 active:scale-90 transition-all text-xl">{e}</button>
            ))}
          </div>
        </div>

        {/* Área do Chat - w-full para evitar centralização feia */}
        <div className="w-full flex-1 overflow-y-auto chat-mask space-y-4 pb-4 px-2 no-scrollbar">
          {messages.slice(-8).map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <div
                className="size-7 rounded-full bg-cover bg-center flex-shrink-0 border border-white/10"
                style={{
                  backgroundImage: `url(${m.avatar_url || 'https://github.com/shadcn.png'})`
                }}
              />

              <div className="flex-1 group/msg relative">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[11px] font-bold text-primary/80">
                    {m.user_name}
                  </p>
                  {(myRole === 'creator' || myRole === 'admin') && (
                    <button
                      onClick={async () => {
                        await supabase.from('messages').delete().eq('id', m.id);
                        setMessages(prev => prev.filter(msg => msg.id !== m.id));
                      }}
                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 hover:text-red-500 rounded"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-on-surface font-medium leading-relaxed bg-surface-container-low p-3 rounded-r-2xl rounded-bl-2xl border border-on-surface/5">
                  {m.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} className="h-4" />
        </div>
      </div>

      {/* Footer Fixo - pb-24 para subir o input acima da barra global do app */}
      <div className="w-full px-6 pt-4 pb-24 bg-gradient-to-t from-surface via-surface to-transparent border-t border-white/5 z-[110]">
        {/* Input de mensagem */}
        <div className="relative flex items-center gap-2">
          {/* Mobile Chat Trigger */}
          <button
            onClick={() => setShowChatOverlay(true)}
            className="md:hidden size-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
          >
            <Users size={18} />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onFocus={() => { if (window.innerWidth < 768) setShowChatOverlay(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  handleSendMessage(chatInput);
                }
              }}
              placeholder="Envie sua intercessão..."
              className="w-full bg-surface-container-low border border-white/10 rounded-full py-3.5 px-5 text-sm focus:ring-1 focus:ring-primary/50 placeholder:text-on-surface/40 outline-none text-on-surface"
            />

            <button
              onClick={() => {
                if (chatInput.trim()) {
                  handleSendMessage(chatInput);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-95"
            >
              <Send size={18} className="text-primary" />
            </button>
          </div>
        </div>
      </div>

      <MicCheckModal show={showMicTest} onClose={() => setShowMicTest(false)} />
      <ChatOverlay
        show={showChatOverlay}
        onClose={() => setShowChatOverlay(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        myRole={myRole}
      />
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
          setPendingRequests(prev => prev.filter(r => r.id !== id));
          await supabase.from('requests').update({ status: 'denied' }).eq('id', id);
        }}
        showChatOverlay={showChatOverlay}
        onToggleChatOverlay={() => setShowChatOverlay(!showChatOverlay)}
        localParticipant={localParticipant}
      />
    </div>
  );
}

function ChatOverlay({ show, onClose, messages, onSendMessage, myRole }: {
  show: boolean;
  onClose: () => void;
  messages: any[];
  onSendMessage: (c: string) => void;
  myRole: string;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex flex-col pt-12">
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <h3 className="text-white font-black uppercase text-[10px] tracking-[0.3em]">Intercessões ao Vivo</h3>
        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-4">
            <img src={m.avatar_url || 'https://github.com/shadcn.png'} className="size-9 rounded-full border border-white/10" alt="" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-primary/80">{m.user_name}</p>
                <p className="text-[9px] text-white/30 uppercase font-bold">{moment(m.created_at).format('HH:mm')}</p>
              </div>
              <p className="text-sm text-white leading-relaxed bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                {m.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-8 bg-black/40 border-t border-white/5 pb-12">
        <div className="relative">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { onSendMessage(input); setInput(""); } }}
            placeholder="Digite sua mensagem de fé..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-4.5 px-6 text-sm text-white outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={() => { if (input.trim()) { onSendMessage(input); setInput(""); } }}
            className="absolute right-2 top-1.5 p-3 bg-primary text-black rounded-full shadow-lg active:scale-90 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MicCheckModal({ show, onClose }: { show: boolean, onClose: () => void }) {
  const [level, setLevel] = useState(0);
  const [isLoopback, setIsLoopback] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!show) { streamRef.current?.getTracks().forEach(t => t.stop()); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      streamRef.current = s;
      const ctx = new AudioContext();
      const ana = ctx.createAnalyser();
      ctx.createMediaStreamSource(s).connect(ana);
      const arr = new Uint8Array(ana.frequencyBinCount);
      const up = () => { if (show && ana) { ana.getByteFrequencyData(arr); setLevel(arr.reduce((a, b) => a + b) / arr.length); requestAnimationFrame(up); } };
      up();
    });
  }, [show]);

  useEffect(() => { if (audioRef.current && streamRef.current) audioRef.current.srcObject = isLoopback ? streamRef.current : null; }, [isLoopback]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#131313] rounded-[3rem] p-10 flex flex-col items-center gap-6 border border-white/5">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_#3fff8b33]"><Mic size={32} className="text-primary" /></div>
        <h3 className="text-white font-black uppercase text-[10px] tracking-[0.3em]">Calibrando Voz</h3>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: `${level * 3}%` }} className="h-full bg-primary shadow-[0_0_10px_#3fff8b]" /></div>
        <button onClick={() => setIsLoopback(!isLoopback)} className={cn("w-full py-4 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", isLoopback ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/50")}>
          {isLoopback ? "Escutando Retorno" : "Testar Retorno"} <Headphones size={14} />
        </button>
        <button onClick={onClose} className="w-full py-4.5 bg-primary text-black rounded-full font-black text-[10px] uppercase shadow-2xl">Está ok!</button>
        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
}

function WarRoomSettings({ show, onClose, roomId, dbParticipants, liveParticipants, myRole, pendingRequests, onApprove, onDeny, showChatOverlay, onToggleChatOverlay, localParticipant }: {
  show: boolean,
  onClose: () => void,
  roomId: string,
  dbParticipants: any[],
  liveParticipants: any[],
  myRole: string,
  pendingRequests: any[],
  onApprove: (r: any) => void,
  onDeny: (id: string) => void,
  showChatOverlay?: boolean,
  onToggleChatOverlay?: () => void,
  localParticipant: any
}) {
  const [tab, setTab] = useState<'invite' | 'users' | 'requests'>('users');
  const [s, setS] = useState("");
  const [res, setRes] = useState<any[]>([]);
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${roomId}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiado! 🙏");
  };

  const handleSearch = async () => {
    if (s.length > 2) {
      const { data } = await supabase.from('profiles').select('*').ilike('username', `%${s}%`).limit(5);
      setRes(data || []);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('participants').update({ role: newRole }).eq('user_id', userId).eq('room_id', roomId);
    if (!error) toast.success(`Cargo atualizado para ${newRole}`);
  };

  const silenceUser = async (userId: string) => {
    const { error } = await supabase.from('participants').update({ role: 'listener' }).eq('user_id', userId).eq('room_id', roomId);
    if (!error) toast.info("Usuário silenciado");
  };

  const openChat = async () => {
    const { error } = await supabase.from('participants').update({ role: 'speaker' }).eq('room_id', roomId).eq('role', 'listener');
    if (!error) toast.success("Microfones liberados para todos! 🎤");
  };

  const closeChat = async () => {
    const { error } = await supabase.from('participants').update({ role: 'listener' }).eq('room_id', roomId).not('role', 'in', '("creator","admin")');
    if (!error) toast.info("Todos foram silenciados.");
  };

  const kickUser = async (userId: string) => {
    await supabase.from('participants').delete().eq('user_id', userId).eq('room_id', roomId);
    toast.error("Usuário removido da sala");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-surface rounded-[2.5rem] border border-on-surface/5 flex flex-col max-h-[80vh] overflow-hidden shadow-2xl"
      >
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <h2 className="text-on-surface font-black uppercase text-xs tracking-[0.2em]">Painel de Gestão</h2>
          <button onClick={onClose} className="size-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container-high transition-colors">
            <X size={18} className="text-on-surface" />
          </button>
        </div>

        <div className="flex px-8 gap-6 border-b border-white/5">
          <button onClick={() => setTab('users')} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative", tab === 'users' ? "text-primary" : "text-on-surface-variant")}>
            Participantes ({dbParticipants.length})
            {tab === 'users' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          {(myRole === 'creator' || myRole === 'admin') && (
            <button onClick={() => setTab('requests')} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative", tab === 'requests' ? "text-primary" : "text-on-surface-variant")}>
              Pedidos ({pendingRequests.length})
              {tab === 'requests' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              {pendingRequests.length > 0 && <div className="absolute top-0 -right-2 size-1.5 bg-red-500 rounded-full animate-pulse" />}
            </button>
          )}
          <button onClick={() => setTab('invite')} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative", tab === 'invite' ? "text-primary" : "text-on-surface-variant")}>
            Buscar e Convidar
            {tab === 'invite' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button onClick={() => onToggleChatOverlay?.()} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ml-auto", showChatOverlay ? "text-primary" : "text-on-surface-variant")}>
            Chat Overlay: {showChatOverlay ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {tab === 'users' && (
            <>
              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("size-3 rounded-full animate-pulse", localParticipant.isMicrophoneEnabled ? "bg-primary" : "bg-red-500")} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Status do seu Microfone</p>
                </div>
                <p className="text-[10px] font-bold text-primary">{localParticipant.isMicrophoneEnabled ? "ATIVO" : "MUTADO"}</p>
              </div>

              {(myRole === 'creator' || myRole === 'admin') && (
                <div className="flex gap-2 mb-6 p-1 bg-surface-container-low rounded-3xl border border-on-surface/5">
                  <button onClick={openChat} className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-2xl transition-all">
                    Liberar Todos
                  </button>
                  <button onClick={closeChat} className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all">
                    Silenciar Todos
                  </button>
                </div>
              )}

              {dbParticipants.map((p) => {
                const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                const isOnline = liveParticipants.some(lp => lp.identity === p.user_id);
                return (
                  <div key={p.id} className="flex items-center justify-between group bg-surface-container-low p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={profile?.avatar_url || "https://github.com/shadcn.png"} className="size-10 rounded-full object-cover border border-white/10" alt="" />
                        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-primary rounded-full border-2 border-[#131313]" />}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white">{profile?.full_name}</p>
                        <p className="text-[9px] text-primary/60 font-black uppercase tracking-tighter">{p.role}</p>
                      </div>
                    </div>

                    {(myRole === 'creator' || myRole === 'admin') && p.user_id !== dbParticipants.find(dp => dp.role === 'creator')?.user_id && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => updateRole(p.user_id, (p.role === 'admin' || p.role === 'speaker') ? 'listener' : 'speaker')}
                          className={cn(
                            "p-2.5 rounded-full transition-all",
                            (p.role === 'admin' || p.role === 'speaker')
                              ? "bg-primary/20 text-primary hover:bg-red-500/20 hover:text-red-500"
                              : "bg-white/5 text-white/30 hover:bg-primary/20 hover:text-primary"
                          )}
                          title="Abrir/Fechar Microfone"
                        >
                          {(p.role === 'admin' || p.role === 'speaker') ? <Mic size={16} /> : <MicOff size={16} />}
                        </button>

                        <button
                          onClick={() => updateRole(p.user_id, p.role === 'admin' ? 'listener' : 'admin')}
                          className={cn(
                            "p-2.5 rounded-full transition-all",
                            p.role === 'admin' ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/30 hover:text-blue-400"
                          )}
                          title="Tornar Administrador"
                        >
                          {p.role === 'admin' ? <ShieldAlert size={16} /> : <ShieldOff size={16} />}
                        </button>

                        <button onClick={() => kickUser(p.user_id)} className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all" title="Remover da sala">
                          <Ban size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {tab === 'requests' && (
            <div className="space-y-4 py-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <Hand size={40} className="mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Ninguém na fila ainda</p>
                </div>
              ) : (
                pendingRequests.map((r) => {
                  const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                  return (
                    <div key={r.id} className="flex items-center justify-between bg-surface-container-low p-4 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={profile?.avatar_url || "https://github.com/shadcn.png"} className="size-10 rounded-full border border-white/10" alt="" />
                        <div>
                          <p className="text-[11px] font-bold text-white">{profile?.full_name}</p>
                          <p className="text-[9px] text-primary/60 font-black uppercase tracking-widest">Pedindo para falar</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onDeny(r.id)} className="p-3 rounded-full bg-white/5 text-white/30 hover:bg-red-500/10 hover:text-red-500 transition-all">
                          <X size={16} />
                        </button>
                        <button onClick={() => onApprove(r)} className="p-3 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all">
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'invite' && (
            <div className="space-y-6">
              <div className="relative group">
                <input
                  value={s}
                  onChange={e => setS(e.target.value)}
                  onKeyUp={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Pesquisar @username para convidar..."
                  className="w-full bg-white/5 border border-white/5 focus:border-primary/30 rounded-2xl py-4 px-6 text-xs text-white placeholder:text-white/20 outline-none transition-all"
                />
                <button onClick={handleSearch} className="absolute right-2 top-1.5 p-2.5 bg-primary text-[#0e0e0e] rounded-xl shadow-lg active:scale-90 transition-all">
                  <Search size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {res.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5 hover:border-primary/20 transition-all group">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar_url || "https://github.com/shadcn.png"} className="w-10 h-10 rounded-2xl object-cover transition-all" alt="" />
                      <p className="text-[11px] font-black uppercase tracking-widest">@{u.username}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const { error } = await supabase.from('participants').insert({ room_id: roomId, user_id: u.id, role: 'listener' });
                        if (error) toast.error("Usuário já está no grupo");
                        else toast.success(`${u.username} foi convocado! 🙏`);
                      }}
                      className="p-3 bg-white/5 text-primary hover:bg-primary hover:text-[#0e0e0e] rounded-2xl border border-primary/20 transition-all"
                    >
                      <UserPlus size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center justify-center py-6 text-center gap-4 bg-white/5 rounded-3xl p-6 border border-white/5">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Link size={20} className="text-primary" />
                </div>
                <div className="max-w-[240px]">
                  <p className="text-white text-xs font-bold mb-1">Link Sagrado</p>
                  <p className="text-white/40 text-[9px] leading-relaxed">Qualquer pessoa com este link pode ver o clamor.</p>
                </div>
                <button
                  onClick={copyInvite}
                  className="w-full py-3.5 bg-primary text-[#0e0e0e] rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl"
                >
                  Copiar Link
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
