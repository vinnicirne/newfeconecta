"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import moment from "moment";
import { Mic, Users, ArrowRight, Clock } from "lucide-react";
import Image from "next/image";
import { getStoredProfile } from "@/lib/profile-cache";

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
    <div className="flex items-center gap-1 text-[10px] font-black text-orange-500 uppercase">
      <Clock size={12} />
      <span>{timeLeft}</span>
    </div>
  );
}

export default function LiveRoomsBar() {
  const [rooms, setRooms] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    
    const fetchRooms = async () => {
      try {
        // Tenta pegar usuário do cache primeiro para evitar Auth Lock
        const cached = getStoredProfile();
        let userId = cached?.id;

        // Se não tiver cache, pega a sessão (mais leve que getUser para este caso)
        if (!userId) {
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id;
        }
        
        if (!isMounted) return;

        let query = supabase
          .from('rooms')
          .select('*, profiles:creator_id(full_name, avatar_url)')
          .eq('status', 'active');

        if (userId) {
          query = query.or(`visibility.eq.public,creator_id.eq.${userId}`);
        } else {
          query = query.eq('visibility', 'public');
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(5);
        if (error) throw error;

        if (!isMounted) return;

        const activeRooms = (data || []).filter(room => {
          const end = moment(room.created_at).add(room.duration_minutes, 'minutes');
          return end.isAfter(moment());
        });
        setRooms(activeRooms);
      } catch (err) {
        console.error("Erro ao buscar salas:", err);
      }
    };
    fetchRooms();

    const channelId = `active-rooms-${Math.random()}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();
    
    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, []);

  if (rooms.length === 0) return null;

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Salas ao Vivo</h3>
        </div>
        <button onClick={() => router.push('/room')} className="text-[10px] font-black uppercase text-whatsapp-teal hover:underline transition-all">Ver todas</button>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
        {rooms.map(room => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => router.push(`/room/${room.id}`)}
            className="flex-shrink-0 w-[240px] bg-white dark:bg-whatsapp-darkLighter p-4 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
                  {room.profiles?.avatar_url ? (
                    <Image 
                      src={room.profiles.avatar_url} 
                      width={40} 
                      height={40} 
                      unoptimized
                      className="w-10 h-10 rounded-xl object-cover" 
                      alt="" 
                    />
                  ) : (
                    <span className="text-white font-bold text-xs uppercase">
                      {(room.profiles?.full_name || room.name || "R")[0]}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-whatsapp-teal rounded-full border-2 border-white dark:border-[#0c0c0c] flex items-center justify-center">
                   <Mic size={8} className="text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold dark:text-white truncate">{room.name}</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase truncate">{room.profiles.full_name}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-2xl">
               <RoomTimer createdAt={room.created_at} duration={room.duration_minutes} />
               <div className="flex items-center gap-1.5 text-[10px] font-black text-whatsapp-teal uppercase">
                 <span>Entrar</span>
                 <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
