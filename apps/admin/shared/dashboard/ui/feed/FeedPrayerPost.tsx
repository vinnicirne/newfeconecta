import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { MoreHorizontal, MessageSquare, Flame, HeartHandshake, X, Heart } from 'lucide-react';
import { FeedComments } from './FeedComments';
import { supabase } from '@/lib/supabase';

export function FeedPrayerPost({ item, onDelete, currentUser, onReload }: any) {
  const requests = item.content;
  const [praying, setPraying] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [prayUsers, setPrayUsers] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isPrayingModalOpen, setIsPrayingModalOpen] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editReason, setEditReason] = useState(requests?.[0]?.reason || '');
  const [editDescription, setEditDescription] = useState(requests?.[0]?.description || '');

  const maxDisplay = 5;

  useEffect(() => {
    fetchLikes();
  }, [item.id]);

  async function fetchLikes() {
    const { data, count } = await supabase
      .from('church_feed_likes')
      .select('*, profiles(id, full_name, avatar_url)', { count: 'exact' })
      .eq('post_id', item.id);
    
    if (count !== null) setLikesCount(count);
    if (data) {
      if (currentUser) {
        setPraying(data.some((like: any) => like.user_id === currentUser.id));
      }
      setPrayUsers(data.map((l: any) => l.profiles).filter(Boolean));
    }
  }

  async function handleToggleLike() {
    if (!currentUser) return;
    
    const wasLiked = praying;
    setPraying(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    // Optimistic UI for avatars
    if (wasLiked) {
      setPrayUsers(prev => prev.filter(u => u.id !== currentUser.id));
      await supabase.from('church_feed_likes').delete().eq('post_id', item.id).eq('user_id', currentUser.id);
    } else {
      const newProfile = {
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || currentUser.full_name || 'Usuário',
        avatar_url: currentUser.user_metadata?.avatar_url || currentUser.avatar_url,
      };
      setPrayUsers(prev => [newProfile, ...prev]);
      await supabase.from('church_feed_likes').insert({ post_id: item.id, user_id: currentUser.id });
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editReason || !editDescription) return toast.error("Preencha todos os campos");

    const { error } = await supabase
      .from('church_events')
      .update({
        title: `Pedido: ${editReason}`,
        metadata: { requests: [{ reason: editReason, description: editDescription }] }
      })
      .eq('id', item.id);

    if (error) {
      toast.error('Erro ao atualizar pedido');
    } else {
      toast.success('Pedido atualizado com sucesso!');
      setIsEditing(false);
      if (onReload) onReload();
    }
  }

  return (
    <div className={`bg-transparent mb-6 relative ${isMenuOpen ? 'z-50' : 'z-0'}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            {item.author?.avatar_url ? (
              <img src={item.author.avatar_url} className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold">
                {item.author?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-transparent rounded-full p-0.5">
              <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
                <Heart size={8} className="text-white fill-current" />
              </div>
            </div>
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white leading-tight">
              {item.author?.full_name || 'Alguém'} <span className="font-normal text-gray-500">pediu oração</span>
            </div>
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
                    setIsEditing(true);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Editar
                </button>
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5">
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-black/5 dark:border-white/5 space-y-4">
            <div>
              <label className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1 block">Motivo</label>
              <input 
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                className="w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 transition-shadow"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1 block">Pedido de Oração</label>
              <textarea 
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                className="w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 resize-none transition-shadow"
                required
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                Salvar
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {requests?.map((req: any, index: number) => (
              <div key={index} className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-black/5 dark:border-white/5 space-y-3">
                <div>
                  <div className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">Motivo</div>
                  <div className="font-bold text-gray-900 dark:text-white text-lg">{req.reason}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">Pedido de Oração</div>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                    {req.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Big Action Button */}
        {!isEditing && (
          <div className="mt-6 flex flex-col items-center">
          <button
            onClick={handleToggleLike}
            className={`w-full max-w-sm py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              praying 
                ? 'bg-[#25D366] text-black shadow-[#25D366]/20' 
                : 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600 hover:-translate-y-0.5'
            }`}
          >
            {praying ? (
              <>
                <Flame className="w-5 h-5 fill-current" />
                Orando
              </>
            ) : (
              <>
                <HeartHandshake className="w-5 h-5" />
                Orar por isso
              </>
            )}
          </button>
          
          {/* Avatar Row */}
          {prayUsers.length > 0 && (
            <button 
              onClick={() => setIsPrayingModalOpen(true)}
              className="mt-4 flex items-center gap-3 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <div className="flex -space-x-2">
                {prayUsers.slice(0, maxDisplay).map((user, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1A2429] bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center text-xs font-bold shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.full_name?.charAt(0)}</span>
                    )}
                  </div>
                ))}
                {prayUsers.length > maxDisplay && (
                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1A2429] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-400 shrink-0">
                    +{prayUsers.length - maxDisplay}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {prayUsers.length} intercessor{prayUsers.length > 1 ? 'es' : ''}
              </span>
            </button>
          )}
        </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 flex items-center gap-6">
        <button 
          onClick={handleToggleLike} 
          className={`flex items-center gap-2 text-sm font-bold transition-colors ${praying ? 'text-green-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Flame size={18} className={praying ? "fill-current" : ""} /> {likesCount > 0 ? `${likesCount} ` : ''}{praying ? 'Orando' : 'Orar'}
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
        <FeedComments postId={item.id} currentUser={currentUser} autoFocus={true} />
      )}

      {/* Praying Users Modal */}
      {isPrayingModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111B21] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#111B21]/90 backdrop-blur-md z-10">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Intercessores ({prayUsers.length})</h3>
              <button onClick={() => setIsPrayingModalOpen(false)} className="p-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full transition-colors text-gray-700 dark:text-gray-300">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-3 no-scrollbar flex-1">
              {prayUsers.map((user, idx) => (
                <div key={user.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1A2429] rounded-xl border border-black/5 dark:border-white/5">
                  <img src={user.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-zinc-800" />
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{user.full_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
