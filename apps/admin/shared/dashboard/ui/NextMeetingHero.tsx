import React, { useState, useEffect } from "react";
import moment from "moment";
import { BookOpen, Users, Shield, CheckCircle2, ChevronRight, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function NextMeetingHero({ data, onOpenMeeting, currentUser, isLeader }: { data: any, onOpenMeeting: (id: string) => void, currentUser?: any, isLeader?: boolean }) {
  const [creatorName, setCreatorName] = useState<string | null>(null);

  useEffect(() => {
    if (data?.event?.created_by) {
      supabase.from('profiles').select('full_name').eq('id', data.event.created_by).single()
        .then(({ data: profile }) => {
          if (profile) setCreatorName(profile.full_name);
        });
    }
  }, [data?.event?.created_by]);

  if (!data || !data.event) return null;

  const { event, preparation, pendingTasks } = data;
  const isReady = preparation.score === 100;
  const canManage = isLeader || (currentUser && currentUser.id === event.created_by);

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Próximo Encontro</p>
          <h2 className="text-2xl font-black">{event.title}</h2>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{moment(event.event_date).format('dddd, DD/MM')}</p>
          <p className="text-emerald-100">
            {moment(event.event_date).format('HH:mm') !== '00:00' ? `às ${moment(event.event_date).format('HH:mm')}` : 'Horário a definir'}
          </p>
        </div>
      </div>

      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">Preparação</span>
          <span className="text-sm font-bold">{preparation.score}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div 
            className="bg-emerald-300 h-2 rounded-full transition-all duration-1000" 
            style={{ width: `${preparation.score}%` }}
          />
        </div>
        
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs font-medium">
            {preparation.hasWord ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-yellow-300" />}
            Palavra
          </div>
          <div className="flex items-center gap-1 text-xs font-medium">
            {preparation.score >= 60 ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-yellow-300" />}
            Escala
          </div>
        </div>
      </div>
      
      {creatorName && (
        <div className="mb-4 flex items-center gap-1 text-xs text-emerald-100/80 bg-black/10 w-fit px-2 py-1 rounded-full">
          <Info className="w-3 h-3" />
          Evento criado por {creatorName}
        </div>
      )}

      <div className="flex gap-2">
        <button 
          onClick={() => onOpenMeeting(event.id)}
          className="flex-1 bg-emerald-600 border border-emerald-400 text-white font-bold py-3 px-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-sm text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirmar Presença</span>
        </button>
        {canManage && (
          <button 
            onClick={() => onOpenMeeting(event.id)}
            className="flex-1 bg-white text-emerald-700 font-bold py-3 px-2 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1 shadow-sm text-sm"
          >
            <span>Gerenciar</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
