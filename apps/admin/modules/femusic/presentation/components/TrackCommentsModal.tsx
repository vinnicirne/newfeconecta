'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, CornerDownRight, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
// Matches actual DB schema:
// id, track_id, user_id, content, parent_id, likes (uuid[]), created_at
// + derived fields from profiles JOIN: author_name, author_avatar
interface Comment {
  id: string;
  track_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes: string[];          // array of user_ids who liked
  created_at: string;
  author_name: string;      // derived from profiles JOIN
  author_avatar: string | null;
}

interface TrackCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle?: string;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, avatarUrl, size = 'md' }: { name: string; avatarUrl?: string | null; size?: 'sm' | 'md' }) => {
  const [error, setError] = useState(false);
  const cls = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs' };

  if (avatarUrl && !error) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${cls[size]} rounded-full object-cover shrink-0 bg-gray-700`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className={`${cls[size]} rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
};

// ─── Time helper ─────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `ha ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `ha ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `ha ${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── SELECT fragment (reused in load + insert) ────────────────────────────────
const SELECT_FRAGMENT = `id, track_id, user_id, content, parent_id, likes, created_at, profiles!user_id ( full_name, avatar_url )`;

function mapRow(c: any, fallbackName = 'Usuario'): Comment {
  return {
    id: c.id,
    track_id: c.track_id,
    user_id: c.user_id,
    content: c.content,
    parent_id: c.parent_id ?? null,
    likes: Array.isArray(c.likes) ? c.likes : [],
    created_at: c.created_at,
    author_name: c.profiles?.full_name || fallbackName,
    author_avatar: c.profiles?.avatar_url || null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrackCommentsModal({ isOpen, onClose, trackId, trackTitle }: TrackCommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Init on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !trackId) return;
    let ignore = false;
    const init = async () => {
      const user = await loadCurrentUser();
      if (!ignore) loadComments(ignore);
    };
    init();
    return () => { ignore = true; };
  }, [isOpen, trackId]);

  // ─── Realtime (best-effort — WebSocket may fail on this VPS) ─────────────
  useEffect(() => {
    if (!isOpen || !trackId) return;
    let channel: any;
    try {
      channel = supabase
        .channel(`track-comments-${trackId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'music_track_comments', filter: `track_id=eq.${trackId}` },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              setComments(prev => {
                if (prev.some(c => c.id === payload.new.id)) return prev;
                return [...prev, mapRow(payload.new)];
              });
            } else if (payload.eventType === 'UPDATE') {
              setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...mapRow(payload.new, c.author_name) } : c));
            } else if (payload.eventType === 'DELETE') {
              setComments(prev => prev.filter(c => c.id !== payload.old.id && c.parent_id !== payload.old.id));
            }
          })
        .subscribe();
    } catch { /* realtime not available */ }
    return () => { if (channel) { try { supabase.removeChannel(channel); } catch {} } };
  }, [isOpen, trackId]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const loadCurrentUser = async () => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('fc_profile_cache') : null;
      if (cached) { const u = JSON.parse(cached); setCurrentUser(u); return u; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const u = profile || { id: user.id, full_name: user.user_metadata?.full_name || 'Usuario' };
        setCurrentUser(u); return u;
      }
    } catch (err) { console.error('loadCurrentUser:', err); }
    return null;
  };

  const loadComments = async (ignore = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('music_track_comments')
        .select(SELECT_FRAGMENT)
        .eq('track_id', trackId)
        .order('created_at', { ascending: true });
      if (!ignore) {
        if (error) console.error('Erro ao buscar comentarios:', error);
        else setComments((data || []).map((c: any) => mapRow(c)));
      }
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  // ─── Send comment ─────────────────────────────────────────────────────────
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;
    if (!currentUser) { toast.error('Voce precisa estar logado para comentar.'); return; }

    setSending(true);
    const text = newComment.trim();
    const parentId = replyingTo?.id ?? null;
    setNewComment('');
    setReplyingTo(null);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId, track_id: trackId, user_id: currentUser.id,
      content: text, parent_id: parentId, likes: [],
      created_at: new Date().toISOString(),
      author_name: currentUser.full_name || 'Usuario FeConecta',
      author_avatar: currentUser.avatar_url || null,
    };
    setComments(prev => [...prev, optimistic]);

    try {
      const { data, error } = await supabase
        .from('music_track_comments')
        .insert({ track_id: trackId, user_id: currentUser.id, content: text, parent_id: parentId })
        .select(SELECT_FRAGMENT)
        .single();
      if (error) throw error;
      if (data) setComments(prev => prev.map(c => c.id === tempId ? mapRow(data as any, currentUser.full_name) : c));
    } catch (err) {
      console.error('Erro ao salvar comentario:', err);
      toast.error('Erro ao enviar comentario.');
      setComments(prev => prev.filter(c => c.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ─── Delete comment ───────────────────────────────────────────────────────
  const handleDelete = async (commentId: string) => {
    if (!confirm('Deseja apagar este comentario?')) return;
    const previous = comments;
    setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
    toast.success('Comentario removido.');
    try {
      // Delete replies first to avoid FK constraint
      await supabase.from('music_track_comments').delete().eq('parent_id', commentId);
      const { error } = await supabase.from('music_track_comments').delete().eq('id', commentId);
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao apagar:', err);
      toast.error('Erro ao apagar comentario.');
      setComments(previous);
    }
  };

  // ─── Like (uses atomic RPC toggle_music_track_comment_like) ──────────────
  const handleLike = async (comment: Comment) => {
    if (!currentUser) { toast.error('Faça login para curtir.'); return; }
    const uid = currentUser.id;
    const isLiked = comment.likes.includes(uid);
    const newLikes = isLiked ? comment.likes.filter(id => id !== uid) : [...comment.likes, uid];

    // Optimistic
    setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: newLikes } : c));
    try {
      const { error } = await supabase.rpc('toggle_music_track_comment_like', { p_comment_id: comment.id });
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao alternar curtida no comentário:', err);
      // Revert
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: comment.likes } : c));
    }
  };


  // ─── Derived ──────────────────────────────────────────────────────────────
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (id: string) => comments.filter(c => c.parent_id === id);

  // Shared action row for root comments and replies
  const ActionRow = ({ comment }: { comment: Comment }) => {
    const liked = currentUser ? comment.likes.includes(currentUser.id) : false;
    return (
      <div className="flex items-center gap-3 mt-1.5">
        <button
          onClick={() => handleLike(comment)}
          className={`flex items-center gap-1 text-[11px] transition-colors ${liked ? 'text-green-500' : 'text-gray-500 hover:text-green-500'}`}
        >
          <Flame className={`w-3 h-3 ${liked ? 'fill-green-500 text-green-500' : ''}`} />
          {comment.likes.length > 0 && comment.likes.length}
        </button>
        {!comment.parent_id && (
          <button
            onClick={() => setReplyingTo({ id: comment.id, name: comment.author_name })}
            className="text-[11px] text-gray-500 hover:text-green-400 transition-colors"
          >
            Responder
          </button>
        )}
        {currentUser?.id === comment.user_id && (
          <button onClick={() => handleDelete(comment.id)} className="text-[11px] text-gray-500 hover:text-red-400 transition-colors">
            Apagar
          </button>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <div key="track-comments-modal" className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 99999 }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75"
          />
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative w-full flex flex-col rounded-t-3xl overflow-hidden shadow-2xl border-t border-white/10"
            style={{ height: '72vh', zIndex: 1, backgroundColor: '#0f0f0f' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Comentarios</h3>
                {trackTitle && <span className="text-xs text-gray-500 truncate max-w-[140px]">{trackTitle}</span>}
                <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-semibold ml-1">{comments.length}</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                  <div className="w-7 h-7 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Carregando...</p>
                </div>
              ) : rootComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <MessageSquare className="w-12 h-12 stroke-1 text-gray-700" />
                  <p className="text-sm font-semibold text-gray-300">Nenhum comentario ainda</p>
                  <p className="text-xs text-gray-500">Seja o primeiro a comentar!</p>
                </div>
              ) : rootComments.map(root => (
                <div key={root.id} className="flex gap-3 items-start">
                  <Avatar name={root.author_name} avatarUrl={root.author_avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-gray-200">{root.author_name}</span>
                      <span className="text-[10px] text-gray-600">{timeAgo(root.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-100 mt-0.5 break-words">{root.content}</p>
                    <ActionRow comment={root} />
                    {/* Replies */}
                    {getReplies(root.id).map(reply => (
                      <div key={reply.id} className="flex gap-2 items-start mt-2 ml-2 pl-3 border-l border-white/10">
                        <Avatar name={reply.author_name} avatarUrl={reply.author_avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[11px] text-gray-300">{reply.author_name}</span>
                            <span className="text-[10px] text-gray-600">{timeAgo(reply.created_at)}</span>
                          </div>
                          <p className="text-xs text-gray-200 mt-0.5 break-words">{reply.content}</p>
                          <ActionRow comment={reply} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 shrink-0" style={{ backgroundColor: '#0f0f0f' }}>
              {replyingTo && (
                <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-lg mb-2 text-xs text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <CornerDownRight className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    Respondendo a <strong className="text-white ml-1">{replyingTo.name}</strong>
                  </span>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <Avatar name={currentUser?.full_name || 'U'} avatarUrl={currentUser?.avatar_url} />
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={replyingTo ? `Respondendo a ${replyingTo.name}...` : 'Adicione um comentario...'}
                  className="flex-1 bg-white/10 text-white placeholder-gray-500 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 border border-transparent transition-all"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || sending}
                  className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-md shrink-0"
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
