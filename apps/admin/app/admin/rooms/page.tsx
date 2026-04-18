"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mic, Trash2, StopCircle, RefreshCw, AlertTriangle, Radio, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomAction, setRoomAction] = useState<{ type: 'end' | 'delete', room: any } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer Atômico para atualização de UI (Salas ao vivo)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, profiles(full_name, avatar_url, username)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (err: any) {
      toast.error(`Erro ao buscar salas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const calculateDuration = (room: any) => {
    if (room.status === 'active' && !room.ended_at) {
      const start = moment(room.created_at);
      const now = moment(currentTime);
      return Math.floor(moment.duration(now.diff(start)).asMinutes());
    }
    return room.duration_minutes || 0;
  };

  const handleAction = async () => {
    if (!roomAction) return;
    const { type, room } = roomAction;

    try {
      if (type === 'end') {
        const { error } = await supabase
          .from('rooms')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString(),
            duration_minutes: calculateDuration(room)
          })
          .eq('id', room.id);
        if (error) throw error;
        toast.success("Sala encerrada e sinal de queda enviado ao servidor.");
      } else if (type === 'delete') {
        const { error } = await supabase
          .from('rooms')
          .delete()
          .eq('id', room.id);
        if (error) throw error;
        toast.success("Histórico da sala removido permanentemente.");
      }
      fetchRooms();
    } catch (err: any) {
      toast.error(`Erro na operação: ${err.message}`);
    } finally {
      setRoomAction(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <Radio className="text-whatsapp-teal animate-pulse" /> Salas de Guerra
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">Monitoramento e moderação de intercessões ao vivo.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-whatsapp-teal/10 px-4 py-2 rounded-2xl border border-whatsapp-teal/20 text-whatsapp-teal font-black text-xs uppercase tracking-widest">
            {rooms.filter(r => r.status === 'active').length} Salas Ativas
          </div>
          <button 
            onClick={fetchRooms}
            className="p-3 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 hover:dark:bg-white/10 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className={cn("w-5 h-5", loading ? "animate-spin text-whatsapp-teal" : "text-gray-500")} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-[32px] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Contexto da Sala</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Liderança</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Duração</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading && rooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-20 text-gray-400 animate-pulse font-bold uppercase text-[10px] tracking-widest">Escaneando frequências...</td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-20 text-gray-400">
                    <Radio className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">Silêncio total na rede.</p>
                  </td>
                </tr>
              ) : (
                rooms.map(room => {
                   const isActive = room.status === 'active' && !room.ended_at;
                   const duration = calculateDuration(room);

                   return (
                     <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                       <td className="p-6">
                         <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all",
                             isActive ? "bg-whatsapp-teal/20 text-whatsapp-teal shadow-lg shadow-whatsapp-teal/10" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                           )}>
                             <Mic className={cn("w-6 h-6", isActive && "animate-bounce")} />
                           </div>
                           <div className="max-w-[200px]">
                             <p className="font-black text-gray-900 dark:text-white truncate text-sm">{room.name}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">{moment(room.created_at).calendar()}</p>
                           </div>
                         </div>
                       </td>
                       <td className="p-6">
                         <div className="flex items-center gap-2">
                           <img src={room.profiles?.avatar_url || "https://github.com/shadcn.png"} className="w-7 h-7 rounded-full border border-whatsapp-teal/20" alt="" />
                           <div className="overflow-hidden">
                             <p className="text-[11px] font-black text-gray-700 dark:text-gray-200 truncate leading-none">
                               {room.profiles?.full_name || 'Desconhecido'}
                             </p>
                             <p className="text-[9px] text-whatsapp-teal dark:text-whatsapp-green font-bold">@{room.profiles?.username || 'anon'}</p>
                           </div>
                         </div>
                       </td>
                       <td className="p-6">
                         {isActive ? (
                           <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-whatsapp-green/10 text-whatsapp-green text-[10px] font-black uppercase tracking-widest w-fit border border-whatsapp-green/20">
                             <span className="w-1.5 h-1.5 rounded-full bg-whatsapp-green animate-ping" />
                             Transmitindo
                           </span>
                         ) : (
                           <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest w-fit">
                             Finalizada
                           </span>
                         )}
                       </td>
                       <td className="p-6">
                         <div className="flex flex-col">
                           <span className={cn("text-sm font-black", isActive ? "text-whatsapp-teal" : "text-gray-500")}>
                             {duration} min
                           </span>
                           <div className="flex items-center gap-1 text-gray-400">
                             <Users size={10} />
                             <span className="text-[9px] font-bold">{room.participant_count || 1} Participantes</span>
                           </div>
                         </div>
                       </td>
                       <td className="p-6 text-right">
                         <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Dialog open={roomAction?.room?.id === room.id && roomAction?.type === 'end'} onOpenChange={(open) => !open && setRoomAction(null)}>
                              <DialogTrigger asChild>
                                <button 
                                  onClick={() => setRoomAction({ type: 'end', room })}
                                  disabled={!isActive}
                                  className="p-3 rounded-2xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-20 transition-all shadow-lg shadow-orange-500/20"
                                  title="Derrubar Transmissão"
                                >
                                  <StopCircle size={18} />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="rounded-[40px] border-white/10 dark:bg-[#0f0f0f]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-orange-500 font-black uppercase text-sm tracking-widest"><AlertTriangle /> Intervenção Crítica</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-gray-600 dark:text-gray-300 my-4 font-medium">
                                  Você está prestes a **interromper a intercessão** "{roomAction?.room?.name}". Isto forçará a queda de áudio para todos os fiéis conectados.
                                </p>
                                <div className="flex items-center justify-end gap-3 mt-4">
                                  <DialogClose asChild><button className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors">Abortar</button></DialogClose>
                                  <button onClick={handleAction} className="px-6 py-3 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all">Confirmar Queda</button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={roomAction?.room?.id === room.id && roomAction?.type === 'delete'} onOpenChange={(open) => !open && setRoomAction(null)}>
                              <DialogTrigger asChild>
                                <button 
                                  onClick={() => setRoomAction({ type: 'delete', room })}
                                  className="p-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                  title="Excluir do Histórico"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="rounded-[40px] border-white/10 dark:bg-[#0f0f0f]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-red-500 font-black uppercase text-sm tracking-widest"><AlertTriangle /> Expurgar Histórico</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-gray-600 dark:text-gray-300 my-4 font-medium">
                                  Confirma a exclusão permanente dos logs da sala "{roomAction?.room?.name}"? Esta ação não pode ser desfeita.
                                </p>
                                <div className="flex items-center justify-end gap-3 mt-4">
                                  <DialogClose asChild><button className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors">Voltar</button></DialogClose>
                                  <button onClick={handleAction} className="px-6 py-3 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-600 transition-all">Limpar Registro</button>
                                </div>
                              </DialogContent>
                            </Dialog>
                         </div>
                       </td>
                     </tr>
                   )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
