"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mic, Plus, Users, Clock, ArrowRight, RefreshCw, X, Crown, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DURATIONS = [
  { label: "15 min", value: 15, premium: false },
  { label: "30 min", value: 30, premium: true },
  { label: "1 hora", value: 60, premium: true },
  { label: "3 horas", value: 180, premium: true },
  { label: "6 horas", value: 360, premium: true },
  { label: "24 horas", value: 1440, premium: true },
];

export default function RoomsListPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(15);
  const router = useRouter();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    // 1. Get User
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setCurrentUser(profile);
    }

    // 2. Fetch Rooms
    const { data } = await supabase
      .from('rooms')
      .select('*, profiles(full_name, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    setRooms(data || []);
    setLoading(false);
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
    if (duration?.premium && !currentUser.is_premium) {
      toast.error("Durações maiores são exclusivas para membros Premium!");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: newRoomName,
          creator_id: currentUser.id,
          status: 'active',
          duration_minutes: selectedDuration
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Sala de Guerra criada!");
      router.push(`/room/${data.id}`);
    } catch (err) {
      toast.error("Erro ao criar sala");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0c] p-6 pb-24 max-w-2xl mx-auto">
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
                   <div className="flex items-center gap-1 text-[10px] text-orange-500 font-black uppercase ml-2">
                     <Clock size={12} />
                     <span>{room.duration_minutes}m</span>
                   </div>
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
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-[#111111] rounded-[40px] p-8 relative shadow-2xl overflow-hidden"
            >
              <button onClick={() => setIsCreating(false)} className="absolute top-6 right-6 p-2 text-gray-400 group hover:text-red-500 transition-colors">
                <X />
              </button>
              
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
                    {currentUser?.is_premium ? (
                      <span className="text-orange-500 flex items-center gap-1"><Crown size={10} /> Premium Ativo</span>
                    ) : (
                      <span className="text-gray-500 flex items-center gap-1 cursor-pointer hover:text-orange-500 transition-all"><Lock size={10} /> Upgrade Premium</span>
                    )}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setSelectedDuration(d.value)}
                        className={cn(
                          "py-3 rounded-2xl text-[10px] font-black uppercase transition-all relative flex flex-col items-center justify-center gap-1",
                          selectedDuration === d.value 
                            ? "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20" 
                            : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10",
                          d.premium && !currentUser?.is_premium && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        {d.label}
                        {d.premium && !currentUser?.is_premium && <Lock size={10} className="absolute top-1 right-1 opacity-50" />}
                        {d.premium && currentUser?.is_premium && <Crown size={10} className="text-orange-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleCreateRoom}
                  className="w-full py-5 bg-whatsapp-teal text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-whatsapp-teal/20 active:scale-95 transition-all mt-4"
                >
                  Abrir Sala Agora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
