"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mic, Plus, Users, Clock, ArrowRight, RefreshCw, X, Crown, Lock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VerificationModal } from "@/components/profile/VerificationModal";
import useSWR, { useSWRConfig } from 'swr';
import { NotificationService } from "@/lib/notifications";

const DURATIONS = [
  { label: "15 min", value: 15, premium: false },
  { label: "30 min", value: 30, premium: true },
  { label: "1 hora", value: 60, premium: true },
  { label: "3 horas", value: 180, premium: true },
  { label: "6 horas", value: 360, premium: true },
  { label: "24 horas", value: 1440, premium: true },
];

import moment from "moment";

function RoomTimer({ createdAt, duration }: { createdAt: string, duration: number }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const end = moment(createdAt).add(duration, 'minutes');
      const diff = end.diff(moment());
      if (diff <= 0) {
        setTimeLeft("00:00");
        return;
      }
      const dur = moment.duration(diff);
      const mins = Math.floor(dur.asMinutes());
      const secs = dur.seconds();
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [createdAt, duration]);

  return (
    <div className="flex items-center gap-1 text-[10px] text-orange-500 font-black uppercase ml-2">
      <Clock size={12} />
      <span>{timeLeft}</span>
    </div>
  );
}

export default function RoomsListPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [visibility, setVisibility] = useState("public");
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    init();
  }, []);

  // 1. Motor de Salas Unificado via SWR (Cache & Realtime)
  const fetcher = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let query = supabase
      .from('rooms')
      .select('*, profiles:creator_id(full_name, avatar_url)')
      .eq('status', 'active');
    
    if (authUser) {
      query = query.or(`visibility.eq.public,creator_id.eq.${authUser.id}`);
    } else {
      query = query.eq('visibility', 'public');
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Filtro de tempo direto no fetcher
    return (data || []).filter(room => {
      const end = moment(room.created_at).add(room.duration_minutes, 'minutes');
      return end.isAfter(moment());
    });
  };

  const { data: swrRooms, mutate } = useSWR('war-room-list', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000 // Revalidação leve a cada 30s (backup do realtime)
  });

  useEffect(() => {
    if (swrRooms) {
      setRooms(swrRooms);
      setLoading(false);
    }
  }, [swrRooms]);

  useEffect(() => {
    // 2. Realtime Cirúrgico: Ouve apenas mudanças vitais
    const channel = supabase
      .channel('war-room-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, async (payload) => {
        // Se uma nova sala ativa surgir, injetamos no topo
        if (payload.new.status === 'active') {
          // Busca perfil do criador (para manter a UI rica)
          const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.creator_id).single();
          const newRoom: any = { ...payload.new, profiles: profile };
          
          mutate((currentRooms: any) => {
            if (!Array.isArray(currentRooms)) return [newRoom];
            // Evita duplicata se o SWR já tiver pegado
            if ((currentRooms as any[]).find((r: any) => r.id === newRoom.id)) return currentRooms;
            return [newRoom, ...currentRooms];
          }, false);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload) => {
        // Se uma sala for fechada, removemos da lista instantaneamente
        if (payload.new.status !== 'active') {
          mutate((currentRooms: any) => {
            if (!Array.isArray(currentRooms)) return [];
            return (currentRooms as any[]).filter((r: any) => r.id !== payload.new.id);
          }, false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const init = async () => {
    // Pegar usuário logado para controle de UI
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setCurrentUser(profile);
    }
  };

  const searchProfiles = async (term: string) => {
    setSearchUser(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(5);
    
    setSearchResults(data || []);
  };

  const toggleInvite = (user: any) => {
    if (invitedUsers.find(u => u.id === user.id)) {
      setInvitedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setInvitedUsers(prev => [...prev, user]);
    }
    setSearchUser("");
    setSearchResults([]);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error("Dê um nome à sala");
      return;
    }

    if (!currentUser) {
      toast.error("Você precisa estar logado");
      return;
    }

    const duration = DURATIONS.find(d => d.value === selectedDuration);
    if (duration?.premium) {
      if (!currentUser.is_verified) {
        toast.error("Durações maiores são exclusivas para Perfis Verificados!");
        return;
      }
      
      // Regra específica para Membro: Máximo 30 minutos
      if (currentUser.verification_label === 'Membro' && selectedDuration > 30) {
        toast.error("O nível 'Membro' é limitado a salas de até 30 minutos. Faça upgrade do seu cargo para liberar tempos maiores!");
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: newRoomName,
          creator_id: currentUser.id,
          status: 'active',
          duration_minutes: selectedDuration,
          visibility: visibility
        })
        .select()
        .single();
      
      if (error) throw error;

      // 2. Adicionar convidados na tabela de participantes
      if (visibility === 'private' && invitedUsers.length > 0) {
        const invites = invitedUsers.map(u => ({
          room_id: data.id,
          user_id: u.id,
          role: 'invited'
        }));
        await supabase.from('participants').insert(invites);

        // 3. Enviar Notificações Ativas para os convidados
        const notifications = invitedUsers.map(u => ({
          recipient_id: u.id,
          sender_id: currentUser.id,
          type: 'room_invite',
          title: 'Convite para Intercessão 🙏',
          content: `${currentUser.full_name} convidou você para a Sala de Guerra: ${newRoomName}`,
          link: `/room/${data.id}`,
          metadata: { room_id: data.id }
        }));
        await supabase.from('notifications').insert(notifications);

        // Notificação de Sistema (Dashboard de Controle)
        await supabase.from('system_errors').insert({
          module: 'ROOM_SECURITY',
          error_message: `Sala Privada ${data.id} criada com ${invitedUsers.length} convidados por ${currentUser.id}`,
          severity: 'info'
        });
      }
      
      // Notificação global inteligente
      if (visibility === 'public') {
        // Dispara de forma assíncrona para não travar a UI
        const authorName = currentUser?.user_metadata?.full_name || currentUser?.full_name || currentUser?.username || 'Um membro';
        NotificationService.notifyNetwork(
          currentUser.id, 
          'new_room', 
          data.id, 
          `${authorName} abriu uma nova Sala de Guerra: ${newRoomName}`
        ).catch(console.error);
      }

      toast.success("Sala de Guerra criada!");
      router.push(`/room/${data.id}`);
    } catch (err) {
      toast.error("Erro ao criar sala");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0c] p-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+96px)] max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Salas de Guerra</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Intercessão ao vivo</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="w-12 h-12 rounded-2xl bg-whatsapp-teal text-white flex items-center justify-center shadow-lg shadow-whatsapp-teal/20 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="animate-spin text-whatsapp-teal" />
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.length === 0 && (
            <div className="text-center py-20 opacity-40">
              <Mic size={48} className="mx-auto mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">Nenhuma sala ativa no momento</p>
              <button 
                onClick={() => setIsCreating(true)}
                className="mt-6 text-whatsapp-teal font-black text-[10px] uppercase underline underline-offset-4"
              >
                Começar uma oração
              </button>
            </div>
          )}

          {rooms.map(room => (
            <motion.div 
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => router.push(`/room/${room.id}`)}
              className="bg-gray-50 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center gap-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all group"
            >
              <div className="relative">
                <img src={room.profiles.avatar_url || "https://github.com/shadcn.png"} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-[#0c0c0c] animate-pulse" />
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{room.name}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">Liderado por {room.profiles.full_name}</p>
                <div className="flex items-center gap-3 mt-2">
                   <div className="flex items-center gap-1 text-[10px] text-whatsapp-teal font-black uppercase">
                     <Users size={12} />
                     <span>Entrar na Sala</span>
                   </div>
                   <RoomTimer createdAt={room.created_at} duration={room.duration_minutes} />
                </div>
              </div>

              <div className="w-10 h-10 rounded-xl bg-whatsapp-teal/10 flex items-center justify-center group-hover:bg-whatsapp-teal transition-colors">
                <ArrowRight size={20} className="text-whatsapp-teal group-hover:text-white" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-[#111111] rounded-[40px] relative shadow-2xl flex flex-col max-h-[85dvh]"
            >
              <button onClick={() => setIsCreating(false)} className="absolute top-6 right-6 p-2 text-gray-400 group hover:text-red-500 transition-colors z-10">
                <X />
              </button>
              
              <div className="p-8 overflow-y-auto no-scrollbar flex-1 rounded-[40px]">
                <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-3xl bg-whatsapp-teal/10 flex items-center justify-center mx-auto mb-4">
                  <Mic className="text-whatsapp-teal" size={32} />
                </div>
                <h2 className="text-xl font-black dark:text-white uppercase tracking-tight">Nova Sala de Guerra</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Defina o tempo de intercessão</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Assunto da Oração</label>
                  <input 
                    type="text" 
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Ex: Pela restauração da família..."
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-3xl px-6 py-4 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2 flex items-center justify-between">
                    <span>Duração da Sala</span>
                    {currentUser?.is_verified ? (
                      <span className="text-orange-500 flex items-center gap-1"><ShieldCheck size={10} /> Verificação Ativa</span>
                    ) : (
                      <span className="text-gray-500 flex items-center gap-1 cursor-pointer hover:text-orange-500 transition-all"><Lock size={10} /> Upgrade Premium / Verificação</span>
                    )}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATIONS.map((d) => {
                      const isMemberLimit = currentUser?.verification_label === 'Membro' && d.value > 30;
                      const isUnverifiedLimit = !currentUser?.is_verified && d.premium;
                      const isLocked = isUnverifiedLimit || isMemberLimit;

                      return (
                        <button
                          key={d.value}
                          onClick={() => setSelectedDuration(d.value)}
                          className={cn(
                            "py-3 rounded-2xl text-[10px] font-black uppercase transition-all relative flex flex-col items-center justify-center gap-1",
                            selectedDuration === d.value 
                              ? "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20" 
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10",
                            isLocked && "opacity-50 grayscale cursor-not-allowed"
                          )}
                        >
                          {d.label}
                          {isLocked && <Lock size={10} className="absolute top-1 right-1 opacity-50" />}
                          {!isLocked && d.premium && <ShieldCheck size={10} className="text-orange-500" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Visibilidade da Sala</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setVisibility('public')}
                        className={cn(
                          "py-4 rounded-3xl flex flex-col items-center gap-2 border-2 transition-all",
                          visibility === 'public' 
                            ? "bg-whatsapp-teal/5 border-whatsapp-teal text-whatsapp-teal" 
                            : "bg-gray-50 dark:bg-white/5 border-transparent text-gray-500"
                        )}
                      >
                        <Users size={20} />
                        <span className="text-[10px] font-black uppercase">Pública</span>
                        <p className="text-[8px] text-gray-400 leading-none">Aparece no Feed</p>
                      </button>

                      <button 
                        onClick={() => setVisibility('private')}
                        className={cn(
                          "py-4 rounded-3xl flex flex-col items-center gap-2 border-2 transition-all",
                          visibility === 'private' 
                            ? "bg-whatsapp-teal/5 border-whatsapp-teal text-whatsapp-teal" 
                            : "bg-gray-50 dark:bg-white/5 border-transparent text-gray-500"
                        )}
                      >
                        <Lock size={20} />
                        <span className="text-[10px] font-black uppercase">Privada</span>
                        <p className="text-[8px] text-gray-400 leading-none">Apenas via Link</p>
                      </button>
                    </div>
                  </div>

                  {visibility === 'private' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2">Convidar Intercessores (@)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={searchUser}
                          onChange={(e) => searchProfiles(e.target.value)}
                          placeholder="Buscar por nome ou @"
                          className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl px-5 py-3 text-xs focus:ring-2 focus:ring-whatsapp-teal/20 outline-none dark:text-white"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1">
                            {searchResults.map(user => (
                              <button 
                                key={user.id}
                                onClick={() => toggleInvite(user)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
                              >
                                <img src={user.avatar_url || "https://github.com/shadcn.png"} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                <div className="text-left">
                                  <p className="text-[10px] font-bold dark:text-white">{user.full_name}</p>
                                  <p className="text-[8px] text-gray-500">@{user.username}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {invitedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-2">
                          {invitedUsers.map(u => (
                            <div key={u.id} className="bg-whatsapp-teal/10 text-whatsapp-teal text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-2 border border-whatsapp-teal/20">
                              <span>{u.full_name}</span>
                              <button onClick={() => toggleInvite(u)} className="hover:text-red-500 transition-colors">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Upgrade Alert Section */}
                  <AnimatePresence>
                    {(!currentUser?.is_verified && DURATIONS.find(d => d.value === selectedDuration)?.premium) || 
                     (currentUser?.verification_label === 'Membro' && selectedDuration > 30) ? (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-3xl p-5 border border-orange-100 dark:border-orange-900/30 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-orange-800 dark:text-orange-300">Duração Exclusiva</p>
                              <p className="text-[10px] text-orange-700/70 dark:text-orange-400/60 font-medium">
                                {currentUser?.verification_label === 'Membro' 
                                  ? "O selo de 'Membro' permite até 30min. Para tempos maiores, solicite um novo cargo verificado."
                                  : "Esta duração é apenas para perfis verificados. Faça o upgrade para liberar."
                                }
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsVerifyModalOpen(true)}
                            className="w-full py-3 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                          >
                            {currentUser?.verification_label === 'Membro' ? "Alterar Cargo Agora" : "Verificar Perfil Agora"}
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={handleCreateRoom}
                  className="w-full py-5 bg-whatsapp-teal text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-whatsapp-teal/20 active:scale-95 transition-all mt-4"
                >
                  Abrir Sala Agora
                </button>
              </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <VerificationModal 
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        user={currentUser}
        onRequested={() => {
          setIsVerifyModalOpen(false);
          toast.success("Solicitação enviada!");
        }}
      />
    </div>
  );
}
