"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mic, Trash2, StopCircle, RefreshCw, AlertTriangle, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import moment from "moment";

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomAction, setRoomAction] = useState<{ type: 'end' | 'delete', room: any } | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, profiles(full_name, avatar_url, email)')
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

  const handleAction = async () => {
    if (!roomAction) return;
    const { type, room } = roomAction;

    try {
      if (type === 'end') {
        const { error } = await supabase
          .from('rooms')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', room.id);
        if (error) throw error;
        toast.success("Sala encerrada com sucesso.");
      } else if (type === 'delete') {
        const { error } = await supabase
          .from('rooms')
          .delete()
          .eq('id', room.id);
        if (error) throw error;
        toast.success("Sala excluída permanentemente.");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Radio className="text-whatsapp-teal" /> Gestão de Salas de Guerra
          </h1>
          <p className="text-sm text-gray-500 mt-1">Supervisão e moderação das salas de intercessão da plataforma.</p>
        </div>
        <button 
          onClick={fetchRooms}
          className="p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 hover:dark:bg-white/10 transition-colors"
        >
          <RefreshCw className={loading ? "animate-spin text-whatsapp-teal" : "text-gray-500 dark:text-gray-400"} />
        </button>
      </div>

      <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="p-4 font-bold">Sala</th>
                <th className="p-4 font-bold">Líder</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Duração (Min)</th>
                <th className="p-4 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading && rooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-400">Carregando salas...</td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-400">Nenhuma sala encontrada no sistema.</td>
                </tr>
              ) : (
                rooms.map(room => {
                   const isActive = room.status === 'active' && !room.ended_at;
                   return (
                     <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                       <td className="p-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-whatsapp-teal/10 flex items-center justify-center flex-shrink-0">
                             <Mic className="w-5 h-5 text-whatsapp-teal" />
                           </div>
                           <div>
                             <p className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{room.name}</p>
                             <p className="text-[10px] text-gray-400">{moment(room.created_at).format('DD/MM/YYYY HH:mm')}</p>
                           </div>
                         </div>
                       </td>
                       <td className="p-4">
                         <div className="flex items-center gap-2">
                           <img src={room.profiles?.avatar_url || "https://github.com/shadcn.png"} className="w-6 h-6 rounded-full" alt="" />
                           <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                             {room.profiles?.full_name || 'Desconhecido'}
                           </span>
                         </div>
                       </td>
                       <td className="p-4">
                         {isActive ? (
                           <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-[10px] font-bold uppercase">Ao Vivo</span>
                         ) : (
                           <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400 text-[10px] font-bold uppercase">Encerrada</span>
                         )}
                       </td>
                       <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                         {room.duration_minutes} min
                       </td>
                       <td className="p-4">
                         <div className="flex items-center gap-2">
                            <Dialog open={roomAction?.room?.id === room.id && roomAction?.type === 'end'} onOpenChange={(open) => !open && setRoomAction(null)}>
                              <DialogTrigger asChild>
                                <button 
                                  onClick={() => setRoomAction({ type: 'end', room })}
                                  disabled={!isActive}
                                  className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Encerrar Transmissão"
                                >
                                  <StopCircle size={16} />
                                </button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-orange-500"><AlertTriangle /> Derrubar Sala de Guerra</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-gray-600 dark:text-gray-300 my-4">
                                  Tem certeza que deseja **encerrar forçadamente** a sala "{roomAction?.room?.name}"? Todos os usuários serão desconectados.
                                </p>
                                <div className="flex items-center justify-end gap-3 mt-4">
                                  <DialogClose asChild><button className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button></DialogClose>
                                  <button onClick={handleAction} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg hover:bg-orange-600 transition-colors">Sim, Encerrar</button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={roomAction?.room?.id === room.id && roomAction?.type === 'delete'} onOpenChange={(open) => !open && setRoomAction(null)}>
                              <DialogTrigger asChild>
                                <button 
                                  onClick={() => setRoomAction({ type: 'delete', room })}
                                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                                  title="Excluir Sala do DB"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-red-500"><AlertTriangle /> Excluir Permanentemente</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-gray-600 dark:text-gray-300 my-4">
                                  Esta ação é irreversível. Você está prestes a deletar completamente a sala "{roomAction?.room?.name}" e todo seu histórico do banco de dados.
                                </p>
                                <div className="flex items-center justify-end gap-3 mt-4">
                                  <DialogClose asChild><button className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button></DialogClose>
                                  <button onClick={handleAction} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg hover:bg-red-600 transition-colors">Excluir e Limpar</button>
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
