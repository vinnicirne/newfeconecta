import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { Calendar, CheckCircle2, MoreHorizontal, MessageSquare, Flame, X, Video } from 'lucide-react';
import { PendingTasks } from '../PendingTasks';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FeedComments } from './FeedComments';

export function FeedEventPost({ item, onOpenMeeting, isLeader, currentUser, onDelete }: any) {
  const { event, preparation, pendingTasks } = item.content;
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showComments, setShowComments] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmedUsers, setConfirmedUsers] = useState<any[]>([]);
  const [isConfirmedModalOpen, setIsConfirmedModalOpen] = useState(false);

  useEffect(() => {
    fetchConfirmedUsers();
    fetchLikes();
  }, [event.id]);

  async function fetchLikes() {
    const { data, count } = await supabase
      .from('church_feed_likes')
      .select('*', { count: 'exact' })
      .eq('post_id', event.id);
    
    if (count !== null) setLikesCount(count);
    if (data && currentUser) {
      setIsLiked(data.some((like: any) => like.user_id === currentUser.id));
    }
  }

  async function handleToggleLike() {
    if (!currentUser) return;
    
    const wasLiked = isLiked;
    // Optimistic UI
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    if (wasLiked) {
      await supabase.from('church_feed_likes').delete().eq('post_id', event.id).eq('user_id', currentUser.id);
    } else {
      await supabase.from('church_feed_likes').insert({ post_id: event.id, user_id: currentUser.id });
    }
  }

  async function fetchConfirmedUsers() {
    const { data: avData, error } = await supabase
      .from('church_event_availabilities')
      .select('*')
      .eq('event_id', event.id)
      .eq('status', 'confirmed');
      
    if (avData) {
      const mapped = await Promise.all(avData.map(async (av) => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', av.user_id).single();
        return { ...av, profiles: profile };
      }));
      setConfirmedUsers(mapped);
    }
  }

  async function handleRSVP() {
    if (!currentUser) return;
    const { error } = await supabase
      .from('church_event_availabilities')
      .upsert({ event_id: event.id, user_id: currentUser.id, status: 'confirmed' });
      
    if (!error) {
      toast.success("Presença confirmada!");
      fetchConfirmedUsers();
    }
  }

  const canManage = isLeader || (currentUser && currentUser.id === event.created_by);
  const maxDisplay = 5;

  return (
    <>
      <div className={`bg-transparent mb-6 relative ${isMenuOpen ? 'z-50' : 'z-0'}`}>
        {/* Header (Author) */}
        <div className="p-4 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <img src={item.author?.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover bg-gray-100" />
            <div>
              <div className="font-bold text-gray-900 dark:text-white leading-tight">{item.author?.full_name}</div>
              <div className="text-xs text-gray-500">{moment(item.created_at).fromNow()}</div>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <MoreHorizontal size={20} />
            </button>
            
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 top-10 mt-1 w-48 bg-white dark:bg-[#1A2429] rounded-xl shadow-lg border border-black/10 dark:border-white/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenMeeting(event.id);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Editar
                  </button>
                  {canManage && (
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDelete();
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <p className="text-gray-800 dark:text-gray-200 mb-4">
            Agendou o próximo encontro: <strong className="text-gray-900 dark:text-white">{event.title}</strong>
          </p>

          {/* Event Details */}
          <div className="mt-2">
            <div className="flex items-center gap-3 text-gray-900 dark:text-white mb-3">
              <Calendar className="w-5 h-5 text-[#25D366]" />
              <span className="font-bold">{moment(event.event_date).format('dddd, DD/MM [às] HH:mm')}</span>
            </div>
            
            <div className="flex flex-col gap-2 mt-4">
              {event.metadata?.meetLink && (
                <a 
                  href={event.metadata.meetLink} 
                  target="_blank" 
                  className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30"
                >
                  <Video size={18} /> Entrar na Célula (Meet)
                </a>
              )}
              <button 
                onClick={handleRSVP}
                className="w-full bg-[#25D366] text-black font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-[#00A884] transition-all"
              >
                <CheckCircle2 size={18} /> Confirmar Presença
              </button>
            </div>

            {/* Confirmed Avatars */}
            {confirmedUsers.length > 0 && (
              <div 
                className="mt-4 flex items-center cursor-pointer hover:opacity-80 transition-opacity bg-white/50 dark:bg-black/20 p-2 rounded-xl"
                onClick={() => setIsConfirmedModalOpen(true)}
              >
                <div className="flex -space-x-2">
                  {confirmedUsers.slice(0, maxDisplay).map((user, idx) => (
                    <img 
                      key={user.user_id} 
                      src={user.profiles?.avatar_url || 'https://via.placeholder.com/40'} 
                      className="w-8 h-8 rounded-full border-2 border-[#E7F6ED] dark:border-[#1E2C22] object-cover" 
                      alt={user.profiles?.full_name}
                    />
                  ))}
                  {confirmedUsers.length > maxDisplay && (
                    <div className="w-8 h-8 rounded-full border-2 border-[#E7F6ED] dark:border-[#1E2C22] bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                      +{confirmedUsers.length - maxDisplay}
                    </div>
                  )}
                </div>
                <div className="ml-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                  {confirmedUsers.length} confirmado{confirmedUsers.length > 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          {/* Pending Tasks (Only for leader) */}
          {(isLeader || (currentUser && currentUser.id === event.created_by)) && pendingTasks?.length > 0 && (
            <div className="mt-4">
              <PendingTasks tasks={pendingTasks} onAction={(action: any) => onOpenMeeting(event.id)} />
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 flex items-center gap-6">
          <button 
            onClick={handleToggleLike} 
            className={`flex items-center gap-2 text-sm font-bold transition-colors ${isLiked ? 'text-green-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Flame size={18} className={isLiked ? "fill-current" : ""} /> {likesCount > 0 ? `${likesCount} ` : ''}{isLiked ? 'Curtido' : 'Curtir'}
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <MessageSquare size={18} /> Comentar
          </button>
        </div>
        
        {/* Comments Section */}
        {showComments && (
          <FeedComments postId={event.id} currentUser={currentUser} autoFocus={true} />
        )}
      </div>

      {/* Confirmed Users Modal */}
      {isConfirmedModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111B21] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#111B21]/90 backdrop-blur-md z-10">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Confirmados ({confirmedUsers.length})</h3>
              <button onClick={() => setIsConfirmedModalOpen(false)} className="p-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full transition-colors text-gray-700 dark:text-gray-300">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-3 no-scrollbar flex-1">
              {confirmedUsers.map(user => (
                <div key={user.user_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1A2429] rounded-xl border border-black/5 dark:border-white/5">
                  <img src={user.profiles?.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" />
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{user.profiles?.full_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
