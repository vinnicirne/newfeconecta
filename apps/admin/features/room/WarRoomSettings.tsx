"use client";

import React, { useState } from "react";
import { 
  X, Mic, MicOff, ShieldAlert, ShieldOff, Ban, Hand, UserPlus, Search, Link, Check 
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WarRoomSettingsProps {
  show: boolean;
  onClose: () => void;
  roomId: string;
  dbParticipants: any[];
  liveParticipants: any[];
  myRole: string;
  pendingRequests: any[];
  onApprove: (r: any) => void;
  onDeny: (id: string) => void;
  showChatOverlay?: boolean;
  onToggleChatOverlay?: () => void;
  localParticipant: any;
}

export function WarRoomSettings({ 
  show, 
  onClose, 
  roomId, 
  dbParticipants, 
  liveParticipants, 
  myRole, 
  pendingRequests, 
  onApprove, 
  onDeny, 
  showChatOverlay, 
  onToggleChatOverlay, 
  localParticipant 
}: WarRoomSettingsProps) {
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
        className="w-full max-w-lg bg-[#0e0e0e] rounded-[2.5rem] border border-white/5 flex flex-col max-h-[80vh] overflow-hidden shadow-2xl"
      >
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <h2 className="text-white font-black uppercase text-xs tracking-[0.2em]">Painel de Gestão</h2>
          <button onClick={onClose} className="size-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="flex px-8 gap-6 border-b border-white/5">
          <button onClick={() => setTab('users')} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative", tab === 'users' ? "text-[#3fff8b]" : "text-white/40")}>
            Membros ({dbParticipants.length})
            {tab === 'users' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3fff8b]" />}
          </button>
          {(myRole === 'creator' || myRole === 'admin') && (
            <button onClick={() => setTab('requests')} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative", tab === 'requests' ? "text-[#3fff8b]" : "text-white/40")}>
              Pedidos ({pendingRequests.length})
              {tab === 'requests' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3fff8b]" />}
              {pendingRequests.length > 0 && <div className="absolute top-0 -right-2 size-1.5 bg-red-500 rounded-full animate-pulse" />}
            </button>
          )}
          <button onClick={() => setTab('invite')} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative", tab === 'invite' ? "text-[#3fff8b]" : "text-white/40")}>
            Convidar
            {tab === 'invite' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3fff8b]" />}
          </button>
          <button onClick={() => onToggleChatOverlay?.()} className={cn("pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ml-auto", showChatOverlay ? "text-[#3fff8b]" : "text-white/40")}>
            Chat: {showChatOverlay ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {tab === 'users' && (
            <>
              <div className="mb-6 p-4 bg-[#3fff8b]/5 border border-[#3fff8b]/20 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("size-3 rounded-full animate-pulse", localParticipant?.isMicrophoneEnabled ? "bg-[#3fff8b]" : "bg-red-500")} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">Status do seu Microfone</p>
                </div>
                <p className="text-[10px] font-bold text-[#3fff8b]">{localParticipant?.isMicrophoneEnabled ? "ATIVO" : "MUTADO"}</p>
              </div>

              {(myRole === 'creator' || myRole === 'admin') && (
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-3xl border border-white/5">
                  <button onClick={openChat} className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-[#3fff8b] hover:bg-[#3fff8b]/10 rounded-2xl transition-all">
                    Liberar Todos
                  </button>
                  <button onClick={closeChat} className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all">
                    Silenciar Todos
                  </button>
                </div>
              )}

              {dbParticipants.map((p) => {
                const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                const isOnline = liveParticipants.some(lp => lp.identity === p.user_id);
                return (
                  <div key={p.id} className="flex items-center justify-between group bg-white/5 p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={profile?.avatar_url || "https://github.com/shadcn.png"} className="size-10 rounded-full object-cover border border-white/10" alt="" />
                        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-[#3fff8b] rounded-full border-2 border-[#131313]" />}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white">{profile?.full_name}</p>
                        <p className="text-[9px] text-[#3fff8b]/60 font-black uppercase tracking-tighter">{p.role}</p>
                      </div>
                    </div>

                    {(myRole === 'creator' || myRole === 'admin') && p.user_id !== dbParticipants.find(dp => dp.role === 'creator')?.user_id && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => updateRole(p.user_id, (p.role === 'admin' || p.role === 'speaker') ? 'listener' : 'speaker')}
                          className={cn(
                            "p-2.5 rounded-full transition-all",
                            (p.role === 'admin' || p.role === 'speaker')
                              ? "bg-[#3fff8b]/20 text-[#3fff8b] hover:bg-red-500/20 hover:text-red-500"
                              : "bg-white/5 text-white/30 hover:bg-[#3fff8b]/20 hover:text-[#3fff8b]"
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
                    <div key={r.id} className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={profile?.avatar_url || "https://github.com/shadcn.png"} className="size-10 rounded-full border border-white/10" alt="" />
                        <div>
                          <p className="text-[11px] font-bold text-white">{profile?.full_name}</p>
                          <p className="text-[9px] text-[#3fff8b]/60 font-black uppercase tracking-widest">Pedindo para falar</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onDeny(r.id)} className="p-3 rounded-full bg-white/5 text-white/30 hover:bg-red-500/10 hover:text-red-500 transition-all">
                          <X size={16} />
                        </button>
                        <button onClick={() => onApprove(r)} className="p-3 rounded-full bg-[#3fff8b]/10 text-[#3fff8b] hover:bg-[#3fff8b] hover:text-black transition-all">
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
                  className="w-full bg-white/5 border border-white/5 focus:border-[#3fff8b]/30 rounded-2xl py-4 px-6 text-xs text-white placeholder:text-white/20 outline-none transition-all"
                />
                <button onClick={handleSearch} className="absolute right-2 top-1.5 p-2.5 bg-[#3fff8b] text-[#0e0e0e] rounded-xl shadow-lg active:scale-90 transition-all">
                  <Search size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {res.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5 hover:border-[#3fff8b]/20 transition-all group">
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
                      className="p-3 bg-white/5 text-[#3fff8b] hover:bg-[#3fff8b] hover:text-[#0e0e0e] rounded-2xl border border-[#3fff8b]/20 transition-all"
                    >
                      <UserPlus size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center justify-center py-6 text-center gap-4 bg-white/5 rounded-3xl p-6 border border-white/5">
                <div className="size-12 rounded-full bg-[#3fff8b]/10 flex items-center justify-center border border-[#3fff8b]/20">
                  <Link size={20} className="text-[#3fff8b]" />
                </div>
                <div className="max-w-[240px]">
                  <p className="text-white text-xs font-bold mb-1">Link Sagrado</p>
                  <p className="text-white/40 text-[9px] leading-relaxed">Qualquer pessoa com este link pode ver o clamor.</p>
                </div>
                <button
                  onClick={copyInvite}
                  className="w-full py-3.5 bg-[#3fff8b] text-[#0e0e0e] rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl"
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
