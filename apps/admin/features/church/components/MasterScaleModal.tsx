"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Calendar, User, Search } from "lucide-react";
import moment from "moment";
import 'moment/locale/pt-br';

moment.locale('pt-br');

export function MasterScaleModal({ groupId, onClose }: { groupId: string, onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [monthFilter, setMonthFilter] = useState<number>(moment().month());
  const [yearFilter, setYearFilter] = useState<number>(moment().year());

  useEffect(() => {
    loadData();
  }, [groupId]);

  async function loadData() {
    setLoading(true);
    try {
      // Load all events for this group
      const { data: eventsData } = await supabase
        .from('church_events')
        .select('*')
        .eq('reference_id', groupId)
        .order('event_date', { ascending: false });

      if (eventsData) {
        setEvents(eventsData);
        
        // Load roles for these events
        const eventIds = eventsData.map(e => e.id);
        if (eventIds.length > 0) {
          const { data: rolesData, error } = await supabase
            .from('church_event_roles')
            .select('*')
            .in('event_id', eventIds);
            
          if (error) console.error("Error loading roles:", error);
            
          const mappedRoles = await Promise.all((rolesData || []).map(async (role) => {
            if (role.assigned_to) {
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', role.assigned_to).single();
              return { ...role, assigned: profile };
            }
            return role;
          }));
          
          setRoles(mappedRoles);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Filter events by selected month and year
  const filteredEvents = events.filter(e => {
    const d = moment(e.event_date);
    return d.month() === monthFilter && d.year() === yearFilter;
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111B21] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-all">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold opacity-80 mb-2 uppercase tracking-wider">
            <Calendar size={16} /> Visão Geral
          </div>
          <h2 className="text-3xl font-black">Escala Completa</h2>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-[#1A2429] flex items-center gap-4">
          <div className="flex-1 max-w-[200px]">
            <select 
              value={monthFilter}
              onChange={e => setMonthFilter(Number(e.target.value))}
              className="w-full bg-white dark:bg-[#111B21] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 outline-none text-gray-900 dark:text-white"
            >
              {moment.months().map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 max-w-[150px]">
            <select 
              value={yearFilter}
              onChange={e => setYearFilter(Number(e.target.value))}
              className="w-full bg-white dark:bg-[#111B21] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 outline-none text-gray-900 dark:text-white"
            >
              {[0, 1, 2].map(offset => (
                <option key={offset} value={moment().year() + offset - 1}>{moment().year() + offset - 1}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111B21]">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Carregando escalas...</div>
          ) : (
            <div className="space-y-8">
              {filteredEvents.length === 0 && (
                <div className="text-center py-10 text-gray-500">Nenhum encontro encontrado para este mês.</div>
              )}
              
              {filteredEvents.map(event => {
                const eventRoles = roles.filter(r => r.event_id === event.id);
                
                return (
                  <div key={event.id} className="bg-gray-50 dark:bg-[#1A2429] rounded-2xl p-5 border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-black/5 dark:border-white/5">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{event.title}</h3>
                        <p className="text-sm text-gray-500">{moment(event.event_date).format('dddd, DD [de] MMMM [às] HH:mm')}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {eventRoles.length === 0 && (
                        <div className="text-sm text-gray-400 italic">Nenhuma escala definida para este dia.</div>
                      )}
                      
                      {eventRoles.map(role => (
                        <div key={role.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#111B21] rounded-xl border border-black/5 dark:border-white/5">
                          <span className="font-bold text-gray-700 dark:text-gray-300">{role.role_name}</span>
                          
                          <div className="flex items-center gap-2">
                            {role.assigned ? (
                              <>
                                <img src={role.assigned.avatar_url || 'https://via.placeholder.com/30'} className="w-6 h-6 rounded-full object-cover" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{role.assigned.full_name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Sem responsável</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
