import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { supabase } from '@/lib/supabase';
import { Send, Reply, X } from 'lucide-react';
import { toast } from 'sonner';

interface FeedCommentsProps {
  postId: string;
  currentUser: any;
  autoFocus?: boolean;
}

export function FeedComments({ postId, currentUser, autoFocus }: FeedCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [newComment, setNewComment] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, replyingTo]);

  async function fetchComments() {
    const { data: commentsData } = await supabase
      .from('church_feed_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsData) {
      // Manual profile mapping since relation might not be defined
      const mapped = await Promise.all(commentsData.map(async (c) => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', c.user_id).single();
        return { ...c, profile };
      }));
      setComments(mapped);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    const commentData = {
      post_id: postId,
      user_id: currentUser.id,
      parent_id: replyingTo ? replyingTo.id : null,
      content: newComment.trim(),
    };

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      ...commentData,
      created_at: new Date().toISOString(),
      profile: {
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || currentUser.full_name || 'Usuário',
        avatar_url: currentUser.user_metadata?.avatar_url || currentUser.avatar_url,
      }
    };

    setComments([...comments, optimisticComment]);
    setNewComment("");
    setReplyingTo(null);

    const { error, data } = await supabase
      .from('church_feed_comments')
      .insert(commentData)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao publicar comentário.');
      // Remove optimistic comment
      setComments(prev => prev.filter(c => c.id !== tempId));
    } else {
      // Replace optimistic comment with actual one
      setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c));
    }
  }

  // Recursive render function
  const renderComments = (parentId: string | null = null, depth = 0) => {
    const thread = comments.filter(c => c.parent_id === parentId);
    
    if (thread.length === 0) return null;

    return (
      <div className={`space-y-3 ${depth > 0 ? 'ml-4 sm:ml-8 border-l-2 border-black/5 dark:border-white/5 pl-3 mt-3' : 'mt-4'}`}>
        {thread.map(comment => {
          const profileLink = comment.profile?.username 
            ? `/profile/${comment.profile.username}` 
            : comment.profile?.id || comment.user_id
            ? `/profile/${comment.profile?.id || comment.user_id}` 
            : null;

          return (
            <div key={comment.id} className="flex gap-3 relative group">
              {profileLink ? (
                <a href={profileLink} className="shrink-0 block">
                  <img 
                    src={comment.profile?.avatar_url || 'https://via.placeholder.com/32'} 
                    className="w-8 h-8 rounded-full object-cover bg-gray-100 dark:bg-zinc-800 hover:opacity-80 transition-opacity"
                    alt={comment.profile?.full_name}
                  />
                </a>
              ) : (
                <img 
                  src={comment.profile?.avatar_url || 'https://via.placeholder.com/32'} 
                  className="w-8 h-8 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-zinc-800"
                  alt={comment.profile?.full_name}
                />
              )}
              <div className="flex-1">
                <div className="bg-gray-100 dark:bg-[#1A2429] rounded-2xl px-4 py-2.5 inline-block min-w-full sm:min-w-0">
                  {profileLink ? (
                    <a href={profileLink} className="font-bold text-sm text-gray-900 dark:text-white leading-tight hover:underline block cursor-pointer">
                      {comment.profile?.full_name || 'Usuário'}
                    </a>
                  ) : (
                    <div className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                      {comment.profile?.full_name || 'Usuário'}
                    </div>
                  )}
                  <div className="text-gray-700 dark:text-gray-200 text-sm mt-0.5 whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </div>
              <div className="flex items-center gap-4 mt-1 px-2">
                <span className="text-[11px] text-gray-500 font-medium">
                  {moment(comment.created_at).fromNow(true)}
                </span>
                <button 
                  onClick={() => setReplyingTo(comment)}
                  className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-bold transition-colors"
                >
                  Responder
                </button>
              </div>
              
              {/* Render Nested */}
              {renderComments(comment.id, depth + 1)}
            </div>
          </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="p-4 text-center text-xs text-gray-500">Carregando comentários...</div>;

  return (
    <div className="border-t border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-[#0A0A0A]/20">
      <div className="p-4">
        {comments.length > 0 ? renderComments() : (
          <div className="text-sm text-gray-500 text-center py-2">Seja o primeiro a comentar.</div>
        )}
      </div>

      <div className="p-4 pt-2">
        {replyingTo && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 text-xs px-3 py-1.5 rounded-t-xl font-medium border border-blue-100 dark:border-blue-900/20 border-b-0">
            <div className="flex items-center gap-1">
              <Reply size={12} /> Respondendo a <span className="font-bold">{replyingTo.profile?.full_name}</span>
            </div>
            <button type="button" onClick={() => setReplyingTo(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <X size={12} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "Escreva sua resposta..." : "Adicione um comentário..."}
            className={`w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 ${replyingTo ? 'rounded-b-xl rounded-t-none' : 'rounded-full'} px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-green-500 transition-colors pr-12`}
          />
          <button 
            type="submit"
            disabled={!newComment.trim()}
            className="absolute right-2 p-1.5 bg-green-500 text-white rounded-full disabled:opacity-50 disabled:bg-gray-300 hover:bg-green-600 transition-colors"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
