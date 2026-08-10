import { Calendar, Clock, MoreVertical, Edit2, Trash2, Users, Lock, EyeOff } from "lucide-react";
import { useState } from "react";
import { ChurchGroup } from "../services/group.service";

interface GroupCardProps {
  group: ChurchGroup & { leader?: { full_name: string; avatar_url?: string } };
  isAdminOrLeader?: boolean;
  isMember?: boolean;
  hasPendingRequest?: boolean;
  isChurchMember?: boolean;
  onEdit?: (group: ChurchGroup) => void;
  onDelete?: (group: ChurchGroup) => void;
  onEnter: (groupId: string) => void;
  onJoinRequest?: (groupId: string, privacy: string) => void;
}

export function GroupCard({ 
  group, 
  isAdminOrLeader, 
  isMember,
  hasPendingRequest,
  isChurchMember,
  onEdit, 
  onDelete, 
  onEnter,
  onJoinRequest 
}: GroupCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const isCell = group.type === 'cell';

  return (
    <div className="bg-white dark:bg-[#111B21] rounded-3xl p-6 hover:border-[#25D366] border border-black/5 dark:border-transparent shadow-sm dark:shadow-none transition-all relative">
      {isAdminOrLeader && (
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400"
          >
            <MoreVertical size={20} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2A3942] rounded-xl shadow-2xl overflow-hidden z-10 border border-black/10 dark:border-white/5">
              <button 
                onClick={() => { setShowMenu(false); onEdit?.(group); }}
                className="w-full text-left px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-gray-200"
              >
                <Edit2 size={16} /> Editar
              </button>
              <button 
                onClick={() => { setShowMenu(false); onDelete?.(group); }}
                className="w-full text-left px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 text-sm font-medium text-red-500 dark:text-red-400"
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          )}
        </div>
      )}

      {isCell ? (
        <>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#25D366] to-[#00A884] rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-[#25D366]/20 overflow-hidden">
              {group.logo_url ? (
                <img src={group.logo_url} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                "👥"
              )}
            </div>
            <div className="flex-1 pr-8">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                {group.name}
                {group.privacy === 'private' && <Lock size={14} className="text-gray-400" />}
                {group.privacy === 'invisible' && <EyeOff size={14} className="text-gray-400" />}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Líder: {group.leader?.full_name || 'Não definido'}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            {group.meeting_day && (
              <div className="flex items-center gap-2">
                <Calendar className="text-[#25D366]" size={16} />
                {group.meeting_day}
              </div>
            )}
            {group.meeting_time && (
              <div className="flex items-center gap-2">
                <Clock className="text-[#25D366]" size={16} />
                {group.meeting_time}
              </div>
            )}
          </div>
          
          {isMember || isAdminOrLeader ? (
            <button 
              onClick={() => onEnter(group.id)}
              className="mt-6 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-3 rounded-2xl text-sm font-bold transition-all"
            >
              Acessar {group.type === 'cell' ? 'Célula' : 'Ministério'}
            </button>
          ) : hasPendingRequest ? (
            <button 
              disabled
              className="mt-6 w-full bg-gray-100 dark:bg-white/5 text-gray-500 py-3 rounded-2xl text-sm font-bold opacity-70 cursor-not-allowed"
            >
              Solicitação Pendente
            </button>
          ) : (
            <button 
              onClick={() => onJoinRequest?.(group.id, group.privacy || 'public')}
              className="mt-6 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-3 rounded-2xl text-sm font-bold transition-all"
            >
              {group.privacy === 'private' ? 'Solicitar Participação' : 'Participar'}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-start gap-4 pr-8">
             <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
               {group.logo_url ? (
                 <img src={group.logo_url} alt={group.name} className="w-full h-full object-cover" />
               ) : (
                 <Users className="text-[#25D366]" size={20} />
               )}
             </div>
             <div className="flex-1">
               <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                 {group.name}
                 {group.privacy === 'private' && <Lock size={14} className="text-gray-400" />}
                 {group.privacy === 'invisible' && <EyeOff size={14} className="text-gray-400" />}
               </h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Líder: {group.leader?.full_name || 'Não definido'}</p>
             </div>
          </div>
          
          {isMember || isAdminOrLeader ? (
            <button 
              onClick={() => onEnter(group.id)}
              className="mt-4 w-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 py-3 rounded-2xl text-sm font-bold transition-all"
            >
              Acessar Ministério
            </button>
          ) : hasPendingRequest ? (
            <button 
              disabled
              className="mt-4 w-full bg-gray-100 dark:bg-white/5 text-gray-500 py-3 rounded-2xl text-sm font-bold opacity-70 cursor-not-allowed"
            >
              Solicitação Pendente
            </button>
          ) : (
            <button 
              onClick={() => onJoinRequest?.(group.id, group.privacy || 'public')}
              className="mt-4 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-3 rounded-2xl text-sm font-bold transition-all"
            >
              {group.privacy === 'private' ? 'Solicitar Participação' : 'Participar'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
