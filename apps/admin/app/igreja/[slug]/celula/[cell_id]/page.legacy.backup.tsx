"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Users, HeartHandshake, BookOpen, MessageCircle, Plus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import moment from "moment";
import 'moment/locale/pt-br';
import { EventDashboard } from "@/features/church/components/EventDashboard";
import { MasterScaleModal } from "@/features/church/components/MasterScaleModal";

moment.locale('pt-br');

export default function CellDashboard() {
  const { slug, cell_id } = useParams();
  const router = useRouter();
  
  const [cell, setCell] = useState<any>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isMasterScaleOpen, setIsMasterScaleOpen] = useState(false);
  const [nextPreacher, setNextPreacher] = useState<{name: string, date: string} | null>(null);

  useEffect(() => {
    loadData();
  }, [cell_id]);

  async function loadData() {
    setIsLoading(true);
    try {
      const { data: cellData, error } = await supabase
        .from('church_groups')
        .select('*')
        .eq('id', cell_id)
        .maybeSingle();
        
      if (error || !cellData) {
        toast.error("Célula não encontrada");
        router.push(`/igreja/${slug}/ministerios`);
        return;
      }

      if (cellData.leader_id) {
        const { data: leaderData } = await supabase.from('profiles').select('*').eq('id', cellData.leader_id).single();
        cellData.leader = leaderData;
      }
      
      setCell(cellData);

      const { data: eventsData } = await supabase
        .from('church_events')
        .select('*')
        .eq('reference_id', cell_id)
        .eq('reference_type', cellData.type)
        .order('event_date', { ascending: true });
      
      setEvents(eventsData || []);

      // Encontrar próxima palavra
      const upcomingEvents = (eventsData || []).filter(e => moment(e.event_date).isSameOrAfter(moment().startOf('day')));
      if (upcomingEvents.length > 0) {
        const nextEvent = upcomingEvents[0];
        const { data: roleData } = await supabase
          .from('church_event_roles')
          .select('*, assigned:profiles(full_name)')
          .eq('event_id', nextEvent.id)
          .ilike('role_name', '%palavra%')
          .maybeSingle();
          
        if (roleData) {
          setNextPreacher({
            name: roleData.assigned?.full_name || 'Alguém',
            date: nextEvent.event_date
          });
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && cellData.leader_id === user.id) {
        setIsLeader(true);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const dateStr = (form.elements.namedItem('date') as HTMLInputElement).value;
    const timeStr = (form.elements.namedItem('time') as HTMLInputElement).value;
    
    if (!title || !dateStr || !timeStr) return toast.error("Preencha todos os campos");

    // Format to ISO
    const event_date = new Date(`${dateStr}T${timeStr}:00`).toISOString();

    const { data, error } = await supabase
      .from('church_events')
      .insert({
        church_id: cell.church_id,
        reference_type: cell.type,
        reference_id: cell_id,
        title,
        event_date
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao agendar encontro");
    } else {
      toast.success("Encontro agendado!");
      setEvents([...events, data].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
      setIsCreateEventOpen(false);
    }
  }

  if (isLoading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center">Carregando...</div>;
  if (!cell) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] pb-24 text-gray-900 dark:text-white transition-colors relative">
      
      {/* HEADER / BANNER */}
      <div className="relative h-48 md:h-64 bg-gray-200 dark:bg-[#111B21]">
        {cell.logo_url ? (
          <img src={cell.logo_url} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-[#0A0A0A] via-transparent to-black/30" />
        
        <button 
          onClick={() => router.back()}
          className="absolute top-6 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10">
        
        {/* INFO PRINCIPAL */}
        <div className="mb-6">
          <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white mb-2 uppercase tracking-wider">
            {cell.type === 'cell' ? 'Pequeno Grupo' : 'Ministério'}
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{cell.name}</h1>
          
          <div className="flex flex-col gap-2 mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            {cell.meeting_day && cell.meeting_time && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" /> 
                {cell.meeting_day} • {cell.meeting_time}
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Encontros & Escalas</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMasterScaleOpen(true)}
                  className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-4 h-4" /> Escala Geral
                </button>
                {isLeader && (
                  <button 
                    onClick={() => setIsCreateEventOpen(true)}
                    className="text-sm font-bold text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1 ml-2"
                  >
                    <Plus className="w-4 h-4" /> Agendar
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {events.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  Nenhum encontro agendado.
                </div>
              )}
              {events.map((ev) => {
                const isPast = moment(ev.event_date).isBefore(moment());
                return (
                  <button 
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all border ${isPast ? 'bg-gray-100 dark:bg-[#1A2429] border-transparent opacity-60' : 'bg-white dark:bg-[#111B21] border-black/5 dark:border-white/5 hover:border-indigo-500/50 shadow-sm'}`}
                  >
                    <div className="text-left">
                      <div className="font-bold text-gray-900 dark:text-white text-lg">{ev.title}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {moment(ev.event_date).format('dddd, DD/MM [às] HH:mm')}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* GRID DE CARTÕES (APPS) */}
        <div className="grid grid-cols-1 gap-4 mt-8">
          
          {/* Card: Próxima Palavra */}
          {nextPreacher && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 rounded-3xl text-white shadow-lg shadow-emerald-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">A Palavra</h3>
                </div>
                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-md">
                  {moment(nextPreacher.date).format('DD/MM')}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-emerald-100 text-sm font-medium">Quem vai trazer a palavra:</p>
                <p className="font-black text-2xl">{nextPreacher.name}</p>
              </div>
            </div>
          )}

          {/* Card: Pedidos de Oração */}
          <div 
            onClick={() => toast.info("Mural de oração em breve")}
            className="bg-white dark:bg-[#111B21] p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Pedidos de oração</h3>
              </div>
              <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-full text-xs font-bold text-gray-500">2</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold text-gray-900 dark:text-gray-200">Maria:</span>
                <span className="text-gray-600 dark:text-gray-400 truncate">Pela minha cirurgia de amanhã...</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="font-bold text-gray-900 dark:text-gray-200">João:</span>
                <span className="text-gray-600 dark:text-gray-400 truncate">Estou buscando emprego na área...</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-center text-sm font-bold text-indigo-500">
              Ver todos os pedidos
            </div>
          </div>

          {/* Card: Estudo da Semana */}
          <div 
            onClick={() => toast.info("Material de estudo em breve")}
            className="bg-white dark:bg-[#111B21] p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Estudo desta semana</h3>
                <p className="text-xs text-gray-500">Disponibilizado pelo líder</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-100 dark:border-white/5">
              <h4 className="font-black text-gray-800 dark:text-gray-200 mb-1">O Bom Samaritano</h4>
              <p className="text-sm text-gray-500">Lucas 10:25-37</p>
            </div>
          </div>

          {/* Card: Conversa da Célula */}
          <Link href={`/igreja/${slug}/celula/${cell_id}/feed`}>
            <div className="bg-white dark:bg-[#111B21] p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Mural da Célula</h3>
                </div>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 border border-white dark:border-[#111B21]" />
                  <div className="w-6 h-6 rounded-full bg-gray-300 border border-white dark:border-[#111B21]" />
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-500/5 rounded-2xl">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-bold">Líder:</span> Não esqueçam do nosso encontro amanhã pessoal! Levem refrigerante! 🍕
                </p>
              </div>
              <div className="mt-4 text-center text-sm font-bold text-blue-500">
                Abrir Mural (Substitui WhatsApp)
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* FAB - Líder */}
      {isLeader && (
        <button 
          onClick={() => toast.success("Menu de liderança em breve")}
          className="fixed bottom-24 right-4 w-14 h-14 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-50"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Menu Inferior Fixo Específico da Célula */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#111B21] border-t border-black/5 dark:border-white/5 px-6 flex items-center justify-between pb-safe z-40 max-w-md mx-auto rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col items-center text-indigo-500">
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">Início</span>
        </div>
        <div onClick={() => toast.info("Lista de membros")} className="flex flex-col items-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">Membros</span>
        </div>
        <div onClick={() => toast.info("Agenda")} className="flex flex-col items-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">Agenda</span>
        </div>
      </div>

      {/* Modal Criar Encontro */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateEvent} className="bg-white dark:bg-[#111B21] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Agendar Encontro</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input required type="text" name="title" defaultValue="Culto da Célula" className="w-full bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Data</label>
                  <input required type="date" name="date" className="w-full bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Horário</label>
                  <input required type="time" name="time" defaultValue={cell.meeting_time || "20:00"} className="w-full bg-gray-100 dark:bg-[#1A2429] rounded-xl px-4 py-3 outline-none text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button type="button" onClick={() => setIsCreateEventOpen(false)} className="flex-1 py-3 bg-gray-200 dark:bg-[#1A2429] text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors">
                Agendar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Event Dashboard */}
      {selectedEventId && (
        <EventDashboard 
          eventId={selectedEventId} 
          churchId={cell.church_id} 
          onClose={() => setSelectedEventId(null)} 
        />
      )}

      {/* Master Scale Modal */}
      {isMasterScaleOpen && (
        <MasterScaleModal 
          groupId={cell_id as string}
          onClose={() => setIsMasterScaleOpen(false)}
        />
      )}

    </div>
  );
}
