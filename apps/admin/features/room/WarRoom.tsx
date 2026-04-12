"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, Mic, MicOff, MessageCircle, Send, Users,
  Settings, ArrowLeft, Heart, Flame,
  ChevronDown, PhoneOff, Shield, UserPlus, Trash,
  MessageSquare, Clock as ClockIcon, Crown, UserMinus, ShieldAlert, Share2,
  Volume2, VolumeX, Headphones, PlayCircle, Search, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LiveKitRoom,
  useParticipants,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  useDataChannel,
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
}

interface Reaction {
  id: number;
  emoji: string;
  x: number;
  offset: number;
}

// --- Main Component ---
export function WarRoom({ roomId, user, onExit }: WarRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: room, error: roomError } = await supabase.from('rooms').select('*, profiles(full_name, avatar_url)').eq('id', roomId).single();
      if (roomError || !room) { toast.error("Sala não encontrada"); onExit(); return; }
      setRoomData(room);

      const isCreator = room.creator_id === user.id;
      // GARANTE QUE O CRIADOR SEMPRE TENHA PRIVILÉGIO (UPSERT)
      // OUTROS USUÁRIOS APENAS INSERT (PRESERVA ROLE SE JÁ EXISTIR)
      if (isCreator) {
        await supabase.from('participants').upsert({
          room_id: roomId,
          user_id: user.id,
          role: 'creator'
        }, { onConflict: 'room_id,user_id' });
      } else {
        await supabase.from('participants').insert({
          room_id: roomId,
          user_id: user.id,
          role: 'listener'
        });
      }

      try {
        const res = await fetch(`/api/livekit/token?room=${roomId}&identity=${user.id}&name=${user.full_name}&avatar=${user.avatar_url || ''}`);
        const { token } = await res.json();
        setToken(token);
      } catch (err) {
        toast.error("Erro ao conectar ao servidor de áudio");
      } finally {
        setLoading(false);
      }
    }
    init();

    const statusChannel = supabase.channel(`room-status-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new.status === 'ended' || payload.new.status === 'closed') {
            toast.info("A sala de oração foi encerrada.");
            onExit();
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(statusChannel); };
  }, [roomId, user.id, onExit]);

  if (loading || !token) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-full border-4 border-whatsapp-teal/20 animate-spin border-t-whatsapp-teal" />
        <p className="text-white font-bold opacity-50 uppercase tracking-widest text-xs">Entrando na oração...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false} audio={true} token={token}
      serverUrl="wss://feconecta-y82v2tn0.livekit.cloud"
      onDisconnected={onExit}
      className="fixed inset-0 z-[100] bg-[#0c0c0c] flex flex-col overflow-hidden text-white"
    >
      <WarRoomInterface roomData={roomData} user={user} onExit={onExit} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// --- Interface UI ---
function WarRoomInterface({ roomData, user, onExit }: { roomData: any, user: any, onExit: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(true);
  const [showModeration, setShowModeration] = useState(false);
  const [showMicTest, setShowMicTest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [remainingTime, setRemainingTime] = useState("");
  const [myRole, setMyRole] = useState<'creator' | 'admin' | 'listener' | 'speaker' | 'none'>('none');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { send } = useDataChannel("reactions");

  // Refs para estabilidade de conexão
  const onExitRef = useRef(onExit);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  useEffect(() => {
    if (!roomData) return;
    const interval = setInterval(() => {
      const start = moment(roomData.created_at);
      const end = start.clone().add(roomData.duration_minutes, 'minutes');
      const now = moment();
      const diff = end.diff(now);
      
      if (diff <= 0) { 
        clearInterval(interval); 
        // Só encerra se a sala estiver realmente ativa para evitar loops de refresh
        if (roomData.creator_id === user.id && roomData.status === 'active') {
          handleEndRoom(); 
        } else {
          onExitRef.current();
        }
        return; 
      }
      
      const duration = moment.duration(diff);
      const h = Math.floor(duration.asHours());
      const m = duration.minutes();
      const s = duration.seconds();
      setRemainingTime(h > 0 ? `${h}h ${m}m` : `${m}:${s < 10 ? '0' : ''}${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [roomData?.id, user.id]);

  const handleEndRoom = async () => {
    try {
      await supabase.from('rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', roomData.id);
      onExit();
    } catch (e) { toast.error("Erro ao encerrar sala"); }
  };

  useEffect(() => {
    if (!roomData?.id) return;
    const fetchRole = async () => {
      const { data } = await supabase.from('participants').select('role').eq('room_id', roomData.id).eq('user_id', user.id).maybeSingle();
      if (data) setMyRole(data.role as any);
      else if (roomData.creator_id === user.id) setMyRole('creator');
    };
    fetchRole();

    // Canal seguro: Identidade única por sala e usuário
    const sc = supabase.channel(`roles-${roomData.id}-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'participants', 
        filter: `user_id=eq.${user.id}` 
      }, async (p) => {
        if (p.eventType === 'DELETE') {
          // CONTRA-PROVA: Verifica se sumiu DESTA sala antes de expulsar
          const { data: stillPresent } = await supabase
            .from('participants')
            .select('id')
            .eq('room_id', roomData.id)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (!stillPresent && roomData.creator_id !== user.id) {
            toast.error("Sua sessão nesta sala foi encerrada.");
            onExitRef.current();
          }
        } else if (p.new && p.new.room_id === roomData.id) {
          setMyRole(p.new.role);
          if (p.new.role === 'speaker') setRequestStatus('approved');
        }
      }).subscribe();
      
    return () => { supabase.removeChannel(sc); };
  }, [roomData?.id, user.id]);

  useEffect(() => {
    const handleData = (payload: Uint8Array, participant: any) => {
      if (participant?.identity === user.id) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'reaction') handleAddReaction(data.emoji, false);
      } catch (e) { }
    };
    room.on('dataReceived', handleData);
    return () => { room.off('dataReceived', handleData); };
  }, [room, user.id]);

  useEffect(() => {
    if (!roomData) return;
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*, profiles(full_name)').eq('room_id', roomData.id).order('created_at', { ascending: true }).limit(50);
      if (data) setMessages(data.map(m => ({ id: m.id, user_id: m.user_id, user_name: m.profiles?.full_name || 'Intercessor', content: m.content, created_at: m.created_at })));
    };
    fetchMsgs();
    const sc = supabase.channel(`chat-${roomData.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomData.id}` }, async (p) => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', p.new.user_id).single();
      setMessages(prev => [...prev, { id: p.new.id, user_id: p.new.user_id, user_name: data?.full_name || 'Intercessor', content: p.new.content, created_at: p.new.created_at }]);
    }).subscribe();
    return () => { supabase.removeChannel(sc); };
  }, [roomData?.id]);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const handleAddReaction = (emoji: string, broadcast = true) => {
    const id = Date.now();
    const xPos = Math.random() * 70 + 15;
    const xOffset = (Math.random() - 0.5) * 200;

    setReactions(prev => [...prev.slice(-15), { id, emoji, x: xPos, offset: xOffset }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 4000);
    if (broadcast) send(new TextEncoder().encode(JSON.stringify({ type: 'reaction', emoji })), { reliable: false });
  };

  const handleSendMessage = async (content: string) => { if (content.trim()) await supabase.from('messages').insert({ room_id: roomData.id, user_id: user.id, content }); };

  const handleRequestToSpeak = async () => {
    if (requestStatus === 'pending') return;
    setRequestStatus('pending');
    await supabase.from('requests').insert({ room_id: roomData.id, user_id: user.id, status: 'pending' });
    toast.success("Pedido enviado!");
  };

  useEffect(() => { if (myRole === 'creator' || myRole === 'admin' || myRole === 'speaker') localParticipant.setMicrophoneEnabled(true); else localParticipant.setMicrophoneEnabled(false); }, [myRole]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0c0c] overflow-hidden text-white pb-20 lg:pb-0">
      {/* Header - Compact */}
      <div className="p-3 lg:p-4 flex items-center justify-between z-30 flex-shrink-0 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onExit} className="p-2.5 bg-white/10 rounded-2xl border border-white/10 active:scale-90 transition-all"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-white/90">{roomData.name}</h2>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em]">Intercessão em Tempo Real</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(myRole === 'creator' || myRole === 'admin') && (
            <button
              onClick={() => setShowModeration(true)}
              className="p-2 lg:p-3 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600/30 transition-all border border-red-600/30 flex items-center gap-2"
            >
              <Shield size={16} />
              <span className="hidden lg:inline text-[9px] font-black uppercase tracking-widest">Painel</span>
            </button>
          )}
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="bg-whatsapp-teal/20 px-2.5 py-1 rounded-full border border-whatsapp-teal/30 flex items-center gap-1.5">
              <ClockIcon size={10} className="text-whatsapp-teal" />
              <span className="text-[10px] font-black text-whatsapp-teal">{remainingTime || "--:--"}</span>
            </div>
            <button onClick={() => setShowMicTest(true)} className="p-1.5 bg-white/10 rounded-xl border border-white/10 text-white hover:bg-whatsapp-teal transition-all flex items-center gap-1">
              <Volume2 size={14} />
              <span className="text-[8px] font-black uppercase hidden lg:inline">Testar Mic</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Area: Column on mobile, Row on Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">

        {/* Left/Middle Column: Speaker + Action Bar */}
        <div className="flex-1 flex flex-col min-h-0 relative">

          <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-4">
            {(() => {
              const activeParticipant = participants.find(p => p.identity === roomData.creator_id)
                || (localParticipant.identity === roomData.creator_id ? localParticipant : null)
                || participants[0]
                || localParticipant;
              return <SpeakerDisplay participant={activeParticipant} roomData={roomData} />;
            })()}

            {/* Floating Chat Overlay */}
            <div className="absolute bottom-4 left-4 right-4 max-h-[160px] overflow-hidden pointer-events-none flex flex-col gap-2 z-20">
              <AnimatePresence>
                {messages.slice(-3).map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 self-start max-w-[80%]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-whatsapp-teal truncate">{msg.user_name || 'Intercessor'}:</span>
                      <span className="text-xs text-white/90">{msg.content}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Floating Reactions Explosion */}
          <div className="absolute inset-0 pointer-events-none z-[60] overflow-hidden">
            <AnimatePresence>
              {reactions.map(r => (
                <motion.div
                  key={r.id}
                  initial={{ y: 0, opacity: 0, scale: 0.5 }}
                  animate={{ y: -window.innerHeight, x: [0, r.offset, 0], opacity: [0, 1, 1, 0], scale: [0.5, 3, 3, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 4, ease: "easeOut" }}
                  className="absolute bottom-40 text-4xl lg:text-5xl drop-shadow-2xl"
                  style={{ left: `${r.x}%` }}
                >
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Consolidated Footer: Participants + Reactions + Actions */}
          <div className="p-4 lg:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-30 flex flex-col gap-4">
            {/* Quick Reactions (Aesthetics from reference) */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { handleAddReaction("🙏"); handleSendMessage("Amém! 🙏"); }}
                className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase text-white border border-white/10 flex items-center gap-2 active:scale-95 transition-all"
              >
                Amém 🙏
              </button>
              <button
                onClick={() => { handleAddReaction("🙌"); handleSendMessage("Glória! 🙌"); }}
                className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase text-white border border-white/10 flex items-center gap-2 active:scale-95 transition-all"
              >
                Glória 🙌
              </button>
            </div>

            {/* Participants bar - Overlapping Stack */}
            <div className="px-6 py-2 z-20 flex items-center justify-center -space-x-3">
              {participants.slice(0, 6).map((p, idx) => (
                <div key={p.sid} className="relative transition-transform hover:translate-y-[-4px]" style={{ zIndex: 10 - idx }}>
                  <ParticipantCircle participant={p} />
                </div>
              ))}
              {participants.length > 6 && (
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[10px] font-bold z-0">
                  +{participants.length - 6}
                </div>
              )}
              <button
                onClick={() => setShowModeration(true)}
                className="w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600 hover:text-white transition-all"
              >
                <UserPlus size={20} />
              </button>
            </div>

            <div className="flex gap-2">
              {["🙏", "🙌", "🔥", "❤️"].map(e => (
                <button
                  key={e}
                  onClick={() => { handleAddReaction(e); handleSendMessage(e); }}
                  className="flex-1 bg-white/10 dark:bg-white/5 py-2.5 rounded-xl border border-white/10 text-lg lg:text-xl active:scale-90 transition-all shadow-lg"
                >
                  {e}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {myRole === 'creator' || myRole === 'admin' || requestStatus === 'approved' ? (
                <button
                  onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
                  className={cn(
                    "flex-1 py-4 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl transition-all border border-white/10",
                    localParticipant.isMicrophoneEnabled
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white"
                      : "bg-gradient-to-r from-whatsapp-teal to-whatsapp-green text-black"
                  )}
                >
                  {localParticipant.isMicrophoneEnabled ? <MicOff size={18} /> : <Mic size={18} />}
                  {localParticipant.isMicrophoneEnabled ? "Ativo" : "Falar agora"}
                </button>
              ) : (
                <button
                  onClick={handleRequestToSpeak}
                  disabled={requestStatus === 'pending'}
                  className="flex-1 py-4 bg-gradient-to-r from-whatsapp-teal to-whatsapp-green text-black rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 shadow-2xl"
                >
                  Pedir para falar
                </button>
              )}

              <button
                onClick={() => setShowChat(!showChat)}
                className={cn(
                  "w-12 h-12 lg:w-14 lg:h-14 rounded-full border border-white/10 flex items-center justify-center transition-all bg-white/5",
                  showChat ? "bg-whatsapp-teal text-black" : "text-white hover:bg-white/10"
                )}
              >
                <MessageSquare size={18} />
              </button>

            </div>
          </div>
        </div>

        {/* Right Column: Chat Dinâmico Real */}
        <div className={cn(
          "bg-[#0a0a0a]/98 lg:bg-[#0a0a0a] border-l border-white/5 transition-all duration-500 flex flex-col z-50 backdrop-blur-3xl shadow-2xl",
          "lg:relative lg:h-full lg:w-80 lg:translate-x-0 lg:opacity-100",
          "fixed bottom-0 left-0 right-0",
          showChat ? "h-[75vh] opacity-100 translate-y-0" : "h-0 opacity-0 translate-y-full overflow-hidden"
        )}>
          {/* Header do Chat */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
            <span className="text-[10px] font-black uppercase tracking-widest text-whatsapp-teal">Chat de Intercessão</span>
            <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4">
            <div className="flex flex-col justify-end min-h-full gap-2 pb-4">
              {messages.map(m => (
                <div key={m.id} className="max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[#1a1a1a]/80 backdrop-blur-xl px-4 py-2 rounded-2xl rounded-bl-none shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-white/5">
                    <span className="text-[10px] font-bold text-[#25D366] block mb-0.5">
                      {m.user_name || 'Intercessor'}
                    </span>
                    <p className="text-xs text-white leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input do Chat: Fixo na Base */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (chatInput.trim()) { handleSendMessage(chatInput); setChatInput(""); } }}
            className="p-4 pb-12 lg:pb-4 border-t border-white/5 bg-black/60 backdrop-blur-md shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escreva um comentário..."
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-xs focus:outline-none focus:border-whatsapp-teal transition-all text-white placeholder:text-gray-600"
              />
              <button
                type="submit"
                className="w-11 h-11 bg-whatsapp-teal rounded-full flex items-center justify-center text-black active:scale-95 transition-all shadow-lg hover:bg-whatsapp-green shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <MicCheckModal show={showMicTest} onClose={() => setShowMicTest(false)} />
      <ModerationPanel show={showModeration} onClose={() => setShowModeration(false)} roomData={roomData} user={user} onExit={onExit} />
    </div>
  );
}

// --- Sub-Components ---

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
      const src = ctx.createMediaStreamSource(s);
      src.connect(ana);
      const arr = new Uint8Array(ana.frequencyBinCount);
      const upd = () => { if (ana) { ana.getByteFrequencyData(arr); setLevel(arr.reduce((a, b) => a + b) / arr.length); if (show) requestAnimationFrame(upd); } };
      upd();
    }).catch(e => toast.error("Não foi possível acessar o mic"));
  }, [show]);

  useEffect(() => { if (audioRef.current && streamRef.current) audioRef.current.srcObject = isLoopback ? streamRef.current : null; }, [isLoopback]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-[360px] bg-neutral-900 border border-white/20 rounded-[32px] p-8 shadow-2xl overflow-hidden z-[1001]"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-whatsapp-green/10 flex items-center justify-center mx-auto mb-4">
                <Mic className="text-whatsapp-green" size={32} />
              </div>
              <h4 className="font-black uppercase tracking-tight text-white text-lg">Teste de Áudio</h4>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sua voz está sendo captada?</p>
            </div>

            <div className="space-y-6">
              <div className="h-5 bg-black/40 rounded-full overflow-hidden flex items-center px-1 border border-white/5">
                <motion.div
                  className="h-2.5 bg-whatsapp-green rounded-full shadow-[0_0_20px_rgba(37,211,102,0.6)]"
                  animate={{ width: `${Math.min(100, level * 3)}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setIsLoopback(!isLoopback)}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border transition-all",
                    isLoopback ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-white/5 text-gray-400 border-white/5"
                  )}
                >
                  {isLoopback ? <VolumeX size={16} /> : <Headphones size={16} />}
                  {isLoopback ? "Desativar Retorno" : "Ouvir Retorno"}
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-4 bg-whatsapp-green text-black rounded-2xl font-black text-[11px] uppercase shadow-[0_4px_20px_rgba(37,211,102,0.4)] active:scale-95 transition-all"
                >
                  Concluir Teste
                </button>
              </div>
            </div>
            <audio ref={audioRef} autoPlay className="hidden" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ModerationPanel({ show, onClose, roomData, user, onExit }: { show: boolean, onClose: () => void, roomData: any, user: any, onExit: () => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    if (!show || !roomData) return;
    const fetchData = async () => {
      const { data: q } = await supabase.from('requests').select('*, profiles(*)').eq('room_id', roomData.id).eq('status', 'pending');
      const { data: p } = await supabase.from('participants').select('*, profiles(*)').eq('room_id', roomData.id);
      if (q) setRequests(q); if (p) setParticipantsList(p);
    };
    fetchData();
    const sc = supabase.channel(`mod-${roomData.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `room_id=eq.${roomData.id}` }, fetchData).on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomData.id}` }, fetchData).subscribe();
    return () => { supabase.removeChannel(sc); };
  }, [show, roomData?.id]);

  const handleSearchUsers = async () => {
    if (inviteSearch.length < 3) return;
    const { data } = await supabase.from('profiles').select('*').ilike('username', `%${inviteSearch}%`).limit(5);
    setSearchResults(data || []);
  };

  const inviteUser = async (profile: any) => {
    const inviteLink = `${window.location.origin}/room/${roomData.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sala de Oração', text: `Participe da oração: ${roomData.name}`, url: inviteLink });
      } catch (err) {
        navigator.clipboard.writeText(inviteLink);
        toast.success("Link copiado!");
      }
    } else {
      navigator.clipboard.writeText(inviteLink);
      toast.success(`@${profile.username} convidado! Link copiado.`);
    }
  };

  const handleEndRoom = async () => {
    if (isEnding) return;
    setIsEnding(true);
    try {
      toast.loading("Encerrando sala...");
      await supabase.from('rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', roomData.id);
      onExit();
    } catch (e) { toast.error("Erro ao encerrar"); setIsEnding(false); }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[1005] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="relative w-80 bg-[#0f0f0f] border-l border-white/10 h-full p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-black uppercase tracking-widest text-[10px] text-gray-500 font-black">Painel de Controle</h4>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-xl"><X size={16} /></button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-whatsapp-teal uppercase">Convidar por Usuário</label>
                <div className="relative">
                  <input value={inviteSearch} onChange={(e) => setInviteSearch(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && handleSearchUsers()} type="text" placeholder="Buscar @username..." className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 pl-10 text-xs text-white outline-none focus:border-whatsapp-teal/50" />
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
                {searchResults.length === 0 && inviteSearch.length >= 3 && <p className="text-[10px] text-red-500 text-center">Usuário não encontrado</p>}
                {searchResults.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={p.avatar_url || "https://github.com/shadcn.png"} className="w-8 h-8 rounded-lg" alt="" />
                      <p className="text-xs font-bold truncate max-w-[80px]">@{p.username}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          await supabase.from('participants').insert({ room_id: roomData.id, user_id: p.id, role: 'listener' });
                          toast.success(`@${p.username} adicionado!`);
                        }}
                        className="p-2 bg-whatsapp-teal text-white rounded-lg"
                      >
                        <UserPlus size={14} />
                      </button>
                      <button onClick={() => inviteUser(p)} className="p-2 bg-white/5 text-gray-400 rounded-lg"><Share2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase">Pedidos Pendentes ({requests.length})</label>
                {requests.map(r => (
                  <div key={r.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold">{r.profiles?.full_name}</span>
                    <button onClick={async () => {
                      await supabase.from('requests').update({ status: 'approved' }).eq('id', r.id);
                      await supabase.from('participants').update({ role: 'speaker' }).eq('room_id', roomData.id).eq('user_id', r.user_id);
                      toast.success("Mic liberado");
                    }} className="px-3 py-1.5 bg-whatsapp-teal rounded-xl text-[8px] font-black">APROVAR</button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase">Intercessores Online</label>
                {participantsList.filter(p => p.user_id !== user.id).map(p => (
                  <div key={p.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={p.profiles?.avatar_url || "https://github.com/shadcn.png"} className="w-8 h-8 rounded-lg" alt="" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold truncate max-w-[70px]">{p.profiles?.full_name}</span>
                        <span className="text-[8px] text-gray-500 uppercase font-black">{p.role}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {p.role === 'listener' && (
                        <button onClick={async () => {
                          await supabase.from('participants').update({ role: 'speaker' }).eq('id', p.id);
                          toast.success("Promovido a Speaker");
                        }} className="p-2 bg-whatsapp-teal/20 text-whatsapp-teal rounded-lg"><Mic size={14} /></button>
                      )}
                      {(p.role === 'speaker' || p.role === 'listener') && (
                        <button onClick={async () => {
                          await supabase.from('participants').update({ role: 'admin' }).eq('id', p.id);
                          toast.success("Promovido a Admin");
                        }} className="p-2 bg-orange-500/20 text-orange-500 rounded-lg"><Shield size={14} /></button>
                      )}
                      <button onClick={async () => { await supabase.from('participants').delete().eq('room_id', roomData.id).eq('user_id', p.user_id); toast.error("Removido"); }} className="p-2 text-red-500 bg-white/5 rounded-lg"><UserMinus size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-2">
              <button
                onClick={handleEndRoom}
                disabled={isEnding}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                  isEnding ? "bg-gray-500/10 text-gray-500 border-gray-500/20" : "bg-red-600/10 text-red-600 border-red-600/20 hover:bg-red-600/20"
                )}
              >
                <PhoneOff size={14} className={isEnding ? "animate-pulse" : ""} /> {isEnding ? "Encerrando..." : "Encerrar Sala de Guerra"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SpeakerDisplay({ participant, roomData }: { participant: any, roomData: any }) {
  const isSpeaking = participant?.isSpeaking || false;
  const [imgError, setImgError] = useState(false);

  let metadata: any = {};
  try {
    const rawMeta = participant?.metadata;
    metadata = rawMeta ? JSON.parse(rawMeta) : {};
  } catch (e) {
    metadata = {};
  }

  const avatarUrl = metadata?.avatar || roomData?.profiles?.avatar_url;
  const hasAvatar = avatarUrl && avatarUrl !== "null" && avatarUrl !== "" && !imgError;
  const name = participant?.name || roomData?.profiles?.full_name || "Intercessor";
  const isCreatorInRoom = (participant?.identity === roomData?.creator_id) || (participant?.name === roomData?.profiles?.full_name);

  const circleSize = "w-32 h-32 lg:w-48 lg:h-48";

  return (
    <div className="flex flex-col items-center">
      <div className={cn("relative mb-6 flex items-center justify-center", circleSize)}>
        {/* NOVO: Ondas Sonoras Estilosas (Pedestal de Áudio) */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full flex items-end justify-center gap-[2px] h-14 pointer-events-none z-0">
          {[...Array(24)].map((_, i) => {
            const distanceFromCenter = Math.abs(i - 12);
            const maxHeight = Math.max(8, 48 - distanceFromCenter * 3);

            return (
              <motion.div
                key={i}
                animate={{
                  height: isSpeaking ? [4, maxHeight, 8, maxHeight * 0.7, 4] : 4,
                  opacity: isSpeaking ? [0.4, 1, 0.4] : 0.1
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.5 + Math.random() * 0.5,
                  delay: i * 0.02
                }}
                className="w-1 bg-gradient-to-t from-whatsapp-green via-whatsapp-green/40 to-transparent rounded-full shadow-[0_0_15px_rgba(37,211,102,0.4)]"
              />
            );
          })}
        </div>

        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.15, opacity: [0, 0.3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-[6px] border-[#25D366] z-0"
            />
          )}
        </AnimatePresence>

        <div className={cn(
          circleSize,
          "rounded-full p-2 border-4 bg-black shadow-2xl relative z-10 transition-all duration-300 flex items-center justify-center overflow-hidden",
          isSpeaking ? "border-[#25D366] scale-105 shadow-[0_0_40px_rgba(37,211,102,0.4)]" : "border-white/30"
        )}>
          {hasAvatar ? (
            <img src={avatarUrl} onError={() => setImgError(true)} className="w-full h-full rounded-full object-cover" alt={name} />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/50">
              <Users size={60} className="lg:w-20 lg:h-20" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 w-9 h-9 lg:w-12 lg:h-12 bg-black rounded-full border-2 lg:border-4 border-[#25D366] flex items-center justify-center shadow-xl">
            <Mic size={16} className={cn("lg:w-5 lg:h-5 transition-all text-[#25D366]", isSpeaking ? "animate-pulse" : "opacity-30")} />
          </div>
        </div>
      </div>

      <div className="text-center relative pt-4 min-h-[80px]">
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -top-1 left-1/2 -translate-x-1/2 bg-[#25D366] text-black px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg z-20"
            >
              Falando...
            </motion.div>
          )}
        </AnimatePresence>
        <h3 className="text-lg lg:text-2xl font-black uppercase tracking-tight text-white leading-tight">{name}</h3>
        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-1 mt-1">
          {isCreatorInRoom ? "Líder em oração" : "Intercessor Ativo"}
          <Mic size={10} className="text-[#25D366]" />
        </p>
      </div>
    </div>
  );
}

function ParticipantCircle({ participant }: { participant: any }) {
  const { isSpeaking } = participant;
  const metadata = participant?.metadata ? JSON.parse(participant.metadata) : {};
  const avatar = metadata.avatar || "https://github.com/shadcn.png";

  return (
    <div className="relative shrink-0">
      <div className={cn("w-12 h-12 rounded-full p-0.5 border-2 transition-all", isSpeaking ? "border-whatsapp-teal scale-105 shadow-[0_0_15px_rgba(37,211,102,0.3)]" : "border-white/5")}>
        <img src={avatar} className="w-full h-full rounded-full object-cover" alt="" />
      </div>
      <div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full border border-black shadow-md", isSpeaking ? "bg-whatsapp-teal" : "bg-gray-800")}>
        {participant.isMicrophoneEnabled ? <Mic size={10} className="text-white" /> : <MicOff size={10} className="text-gray-400" />}
      </div>
    </div>
  );
}
