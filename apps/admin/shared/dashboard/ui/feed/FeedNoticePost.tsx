import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { MoreHorizontal, MessageSquare, Flame, Megaphone, Image as ImageIcon, Mic } from 'lucide-react';
import { FeedComments } from './FeedComments';
import { supabase } from '@/lib/supabase';

export function FeedNoticePost({ item, onDelete, currentUser, onReload }: any) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const notice = item.content;
  const [isEditing, setIsEditing] = useState(false);
  const [editNoticeText, setEditNoticeText] = useState(notice?.title || '');

  useEffect(() => {
    fetchLikes();
  }, [item.id]);

  async function fetchLikes() {
    const { data, count } = await supabase
      .from('church_feed_likes')
      .select('*', { count: 'exact' })
      .eq('post_id', item.id);
    
    if (count !== null) setLikesCount(count);
    if (data && currentUser) {
      setIsLiked(data.some((like: any) => like.user_id === currentUser.id));
    }
  }

  async function handleToggleLike() {
    if (!currentUser) return;
    
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    if (wasLiked) {
      await supabase.from('church_feed_likes').delete().eq('post_id', item.id).eq('user_id', currentUser.id);
    } else {
      await supabase.from('church_feed_likes').insert({ post_id: item.id, user_id: currentUser.id });
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editNoticeText) return toast.error("Preencha o campo do aviso");

    const { error } = await supabase
      .from('church_events')
      .update({
        title: editNoticeText,
      })
      .eq('id', item.id);

    if (error) {
      toast.error('Erro ao atualizar aviso');
    } else {
      toast.success('Aviso atualizado com sucesso!');
      setIsEditing(false);
      if (onReload) onReload();
    }
  }

  return (
    <div className={`bg-transparent mb-6 relative ${isMenuOpen ? 'z-50' : 'z-0'}`}>
      {/* Header (Author) */}
      <div className="p-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            {item.author?.avatar_url ? (
              <img src={item.author.avatar_url} className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold">
                {item.author?.full_name?.charAt(0) || '?'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-transparent rounded-full p-0.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${notice.metadata?.mediaType === 'image' ? 'bg-purple-500' : notice.metadata?.mediaType === 'audio' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                {notice.metadata?.mediaType === 'image' ? <ImageIcon size={8} className="text-white" /> : notice.metadata?.mediaType === 'audio' ? <Mic size={8} className="text-white" /> : <Megaphone size={8} className="text-white fill-current" />}
              </div>
            </div>
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white leading-tight">
              {item.author?.full_name}
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
      <div className="px-4 pb-4">
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-black/5 dark:border-white/5 space-y-4">
            <div>
              <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1 block">Editar Aviso</label>
              <textarea 
                value={editNoticeText}
                onChange={e => setEditNoticeText(e.target.value)}
                rows={4}
                className="w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-shadow"
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
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
              >
                Salvar
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {notice.title && (
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line text-lg">
                {notice.title}
              </p>
            )}
            
            {notice.metadata?.mediaUrl && notice.metadata?.mediaType === 'image' && (
              <img src={notice.metadata.mediaUrl} className="w-full h-auto rounded-xl max-h-96 object-cover" />
            )}
            
            {notice.metadata?.mediaUrl && notice.metadata?.mediaType === 'audio' && (
              <div className="bg-gray-100 dark:bg-[#1A2429] p-3 rounded-xl border border-black/5 dark:border-white/5">
                <audio controls src={notice.metadata.mediaUrl} className="w-full h-10" />
              </div>
            )}
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
        <FeedComments postId={item.id} currentUser={currentUser} autoFocus={true} />
      )}
    </div>
  );
}
