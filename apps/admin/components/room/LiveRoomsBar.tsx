"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import moment from "moment";
import { Mic, Users, ArrowRight, Clock } from "lucide-react";

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
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*, profiles(full_name, avatar_url)')
        .eq('status', 'active')
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      const activeRooms = (data || []).filter(room => {
        const end = moment(room.created_at).add(room.duration_minutes, 'minutes');
        return end.isAfter(moment());
      });
      setRooms(activeRooms);
    };
    fetchRooms();

    const channelId = `active-rooms-${Math.random()}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
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
                <img src={room.profiles.avatar_url || "https://github.com/shadcn.png"} className="w-10 h-10 rounded-xl object-cover" alt="" />
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
