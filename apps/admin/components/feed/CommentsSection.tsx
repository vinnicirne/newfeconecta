"use client";

import { useState, useEffect } from 'react';
import { Send, Flame, Reply, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import moment from 'moment';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { NotificationService } from '@/lib/notifications';

export default function CommentsSection({ postId, verseId, user, postAuthorId, onCommentAdded, onCommentDeleted }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<any>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const tableName = verseId ? 'daily_verse_comments' : 'comments';
      const foreignIdKey = verseId ? 'verse_id' : 'post_id';
      const targetId = verseId || postId;

      const { data: commentsData, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(foreignIdKey, targetId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const rawComments = commentsData || [];
      if (rawComments.length > 0) {
        const userIds = Array.from(new Set(rawComments.map((c: any) => c.profile_id || c.user_id).filter(Boolean)));
        
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, username')
            .in('id', userIds);
            
          profilesMap = (profiles || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
        
        const mappedComments = rawComments.map((c: any) => ({
          ...c,
          author: profilesMap[c.profile_id || c.user_id] || { full_name: 'Usuário' }
        }));
        
        setComments(mappedComments);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      const userId = user.id || (await supabase.auth.getUser()).data.user?.id;
      const tableName = verseId ? 'daily_verse_comments' : 'comments';
      const foreignIdKey = verseId ? 'verse_id' : 'post_id';
      const targetId = verseId || postId;
      
      if (editingComment) {
        const { error } = await supabase
          .from(tableName)
          .update({ content: text.trim() })
          .eq('id', editingComment.id);
        if (error) throw error;
      } else {
        const insertData: any = {
          profile_id: userId,
          content: text.trim(),
          parent_id: replyingTo?.id || null
        };
        // Atribui o ID correto dependendo da tabela
        insertData[foreignIdKey] = targetId;

        const { error } = await supabase
          .from(tableName)
          .insert(insertData);
        if (error) throw error;
      }

      // Notificações
      if (!editingComment) {
        // Notificar o autor do post
        if (postAuthorId) {
          await NotificationService.notify({
            recipientId: postAuthorId,
            senderId: userId,
            type: 'comment',
            postId: postId,
            content: text.trim().substring(0, 50) + (text.length > 50 ? '...' : '')
          });
        }
        
        // Parsear Menções
        await NotificationService.parseMentions(text.trim(), userId, postId);
      }

      setText('');
      setReplyingTo(null);
      setEditingComment(null);
      fetchComments();
      if (!editingComment) onCommentAdded?.();
    } catch (err: any) {
      toast.error("Erro ao salvar comentário: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (id: string) => {
    const tableName = verseId ? 'daily_verse_comments' : 'comments';
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== id));
      toast.success("Comentário removido!");
      onCommentDeleted?.();
    }
  };

  const toggleLike = async (comment: any) => {
    if (!user) return;
    const userId = user.id;
    const oldLikes = comment.likes || [];
    const newLikes = oldLikes.includes(userId) ? oldLikes.filter((id: string) => id !== userId) : [...oldLikes, userId];

    setComments(prev => prev.map(c => 
      c.id === comment.id ? { ...c, likes: newLikes } : c
    ));

    try {
      const tableName = verseId ? 'daily_verse_comments' : 'comments';
      const { error } = await supabase
        .from(tableName)
        .update({ likes: newLikes })
        .eq('id', comment.id);
      if (error) throw error;
    } catch (err) {
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: oldLikes } : c));
      toast.error("Não foi possível salvar sua curtida.");
    }
  };

  const toggleThread = (id: string) => {
    setExpandedThreads(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderComment = (c: any, isReply = false) => {
    const isAdmin = user?.role === 'admin';
    const isOwner = c.profile_id === user?.id || isAdmin;
    const hasLikes = c.likes?.length > 0;
    const isLiked = c.likes?.includes(user?.id);
    const replies = comments.filter(reply => reply.parent_id === c.id);
    const hasReplies = replies.length > 0;
    const isExpanded = expandedThreads[c.id];

    return (
      <div key={c.id} className={`flex gap-2 ${isReply ? 'ml-9 mt-2' : 'mt-4'}`}>
        <div className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full overflow-hidden bg-muted flex-shrink-0 border border-white/5`}>
          {c.author?.avatar_url
            ? <img src={c.author.avatar_url} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white text-[10px] font-bold">{(c.author?.full_name || 'U')[0]}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 dark:bg-whatsapp-dark rounded-2xl px-3 py-2 border border-gray-100 dark:border-white/5 relative group">
            <div className="flex justify-between items-start mb-0.5">
              <p className="text-[11px] font-bold text-whatsapp-teal dark:text-whatsapp-green leading-none">{c.author?.full_name}</p>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all">
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingComment(c); setText(c.content); }} className="text-[11px]">
                      <Pencil className="w-3 h-3 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteComment(c.id)} className="text-[11px] text-red-500">
                      <Trash2 className="w-3 h-3 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="text-xs dark:text-gray-200 leading-normal">
              {c.content.split(/(#[\wáàâãéèêíïóôõöúç-]+|@[\w.-]+|\n)/g).map((part: string, i: number) => {
                if (part === '\n' || part === '\r\n') return <br key={i} />;
                if (part.startsWith('@')) return <Link key={i} href={`/profile/${part.substring(1)}`} className="text-whatsapp-teal dark:text-whatsapp-green font-bold cursor-pointer hover:underline">{part}</Link>;
                if (part.startsWith('#')) return <Link key={i} href={`/explore/${part.substring(1)}`} className="text-whatsapp-teal dark:text-whatsapp-green font-medium cursor-pointer hover:underline">{part}</Link>;
                return part;
              })}
            </p>
            
            {hasLikes && (
              <div className="absolute -right-2 -bottom-2 bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/10 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
                <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                <span className="text-[9px] font-bold dark:text-white">{c.likes.length}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-1.5 ml-2">
            <p className="text-[10px] text-gray-500 font-medium">{moment(c.created_at).fromNow()}</p>
            <button 
              onClick={() => toggleLike(c)} 
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold transition-all active:scale-125",
                isLiked ? "text-orange-500" : "text-gray-500"
              )}
            >
              <Flame className={cn("w-3 h-3", isLiked && "fill-orange-500")} />
              <span>{c.likes?.length || 0}</span>
            </button>
            <button onClick={() => { setReplyingTo(c); setText(`@${c.author?.username || c.author?.full_name?.split(' ')[0] || 'usuario'} `); }} className="text-[10px] text-gray-500 font-bold hover:underline flex items-center gap-1">
              <Reply className="w-3 h-3" /> Responder
            </button>
            
            {hasReplies && (
              <button onClick={() => toggleThread(c.id)} className="text-[10px] text-whatsapp-teal dark:text-whatsapp-green font-bold hover:underline">
                {isExpanded ? 'Ocultar' : `Ver respostas (${replies.length})`}
              </button>
            )}
          </div>

          {isExpanded && replies.map(reply => renderComment(reply, true))}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pb-4">
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-t border-gray-50 dark:border-white/5 pt-2">
        {comments.filter(c => !c.parent_id).length > 0 ? (
          comments.filter(c => !c.parent_id).map(c => renderComment(c))
        ) : (
          <p className="text-center py-6 text-xs text-gray-500 font-medium">Seja o primeiro a comentar!</p>
        )}
      </div>

      <div className="mt-4">
        {replyingTo && (
          <div className="flex items-center justify-between bg-whatsapp-teal/10 px-3 py-1.5 rounded-t-xl border-x border-t border-whatsapp-teal/20">
            <p className="text-[10px] text-whatsapp-teal font-bold flex items-center gap-1">
              <Reply className="w-3 h-3" /> Respondendo a {replyingTo.author?.full_name}
            </p>
            <button onClick={() => { setReplyingTo(null); setText(''); }} className="text-[10px] text-gray-500 hover:text-red-500 font-bold">Cancelar</button>
          </div>
        )}
        {editingComment && (
          <div className="flex items-center justify-between bg-orange-500/10 px-3 py-1.5 rounded-t-xl border-x border-t border-orange-500/20">
            <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
              <Pencil className="w-3 h-3" /> Editando comentário
            </p>
            <button onClick={() => { setEditingComment(null); setText(''); }} className="text-[10px] text-gray-500 hover:text-red-500 font-bold">Cancelar</button>
          </div>
        )}
        <div className={`flex gap-2 items-center bg-gray-50 dark:bg-whatsapp-dark p-1 pr-3 border border-gray-100 dark:border-white/5 transition-all ${replyingTo || editingComment ? 'rounded-b-2xl' : 'rounded-2xl'}`}>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={replyingTo ? "Escreva sua resposta..." : "Adicionar comentário..."}
            className="text-xs h-10 bg-transparent border-none focus-visible:ring-0"
          />
          <button 
            onClick={handleSend} 
            disabled={sending || !text.trim()} 
            className="text-whatsapp-teal dark:text-whatsapp-green disabled:opacity-40 transition-all active:scale-90"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
