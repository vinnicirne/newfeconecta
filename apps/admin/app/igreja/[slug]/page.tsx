"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Flame, BookOpen, Video, Heart, ArrowRight, Settings, Globe2, MoreVertical, MessageCircle, Share2, Edit3, Trash2, Send, Mic, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UnifiedComposer from "@/components/feed/UnifiedComposer";
import moment from "moment";
import { useChurch } from "@/contexts/ChurchContext";

function CommentNode({ 
  comment, 
  allComments, 
  postId, 
  replyingTo, 
  setReplyingTo, 
  replyInput, 
  setReplyInput, 
  handleAddComment 
}: any) {
  const children = allComments.filter((c: any) => c.parent_id === comment.id);
  
  return (
    <div className="flex gap-3 flex-col mt-3 first:mt-0">
      <div className="flex gap-3">
        <img 
          src={comment.author?.avatar_url || 'https://via.placeholder.com/32'} 
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
        <div className="flex-1">
          <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-sm inline-block">
            <p className="font-bold text-sm text-foreground">{comment.author?.full_name}</p>
            <p className="text-[15px] text-foreground">{comment.content}</p>
          </div>
          <div className="flex gap-4 mt-1 ml-2 text-xs font-semibold text-muted-foreground">
            <button className="hover:text-whatsapp-teal transition-colors" onClick={() => setReplyingTo((prev: any) => ({ ...prev, [postId]: prev[postId] === comment.id ? null : comment.id }))}>Responder</button>
            <span className="font-normal opacity-70">{new Date(comment.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Input de Resposta */}
      {replyingTo[postId] === comment.id && (
        <div className="ml-11 flex gap-2 items-center mt-1 mb-2">
          <input 
            type="text" 
            autoFocus
            placeholder="Escreva uma resposta..."
            className="flex-1 min-w-0 bg-muted rounded-full px-4 py-1.5 text-xs text-foreground outline-none border border-transparent focus:border-whatsapp-teal transition-colors"
            value={replyInput[comment.id] || ''}
            onChange={e => setReplyInput((prev: any) => ({ ...prev, [comment.id]: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddComment(postId, comment.id);
            }}
          />
          <button 
            onClick={() => handleAddComment(postId, comment.id)}
            disabled={!replyInput[comment.id]?.trim()}
            className="p-1.5 rounded-full bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight transition-colors disabled:opacity-50 shrink-0"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      )}

      {/* Respostas Recursivas */}
      {children.length > 0 && (
        <div className="ml-11 flex flex-col border-l-2 border-border pl-4">
          {children.map((child: any) => (
            <CommentNode 
              key={child.id}
              comment={child}
              allComments={allComments}
              postId={postId}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyInput={replyInput}
              setReplyInput={setReplyInput}
              handleAddComment={handleAddComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChurchProfile({ params }: { params: { slug: string } }) {
  // ✅ Dados do layout via contexto — zero re-fetch de church/user/member
  const { church, currentUser, isMember } = useChurch();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerInitialMode, setComposerInitialMode] = useState<'text' | 'audio' | 'gallery'>('text');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  
  // Comments state
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  
  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState<string>("");
  
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (church?.id) loadFeed();
  }, [church?.id]);

  async function loadFeed() {
    setLoading(true);

    // ✅ Rodada única: posts + likes do user em paralelo — church e user já vieram do contexto
    const postsQuery = supabase
      .from('church_posts')
      .select('*, author:profiles(full_name, avatar_url, username)')
      .eq('church_id', church.id)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    const likesQuery = currentUser
      ? supabase.from('church_post_likes').select('post_id').eq('user_id', currentUser.id)
      : Promise.resolve({ data: [] });

    const [{ data: feedPosts }, { data: userLikes }] = await Promise.all([postsQuery, likesQuery]);

    const loadedPosts = feedPosts || [];
    setPosts(loadedPosts);
    setHasMore(loadedPosts.length === PAGE_SIZE);

    const counts: Record<string, number> = {};
    const cCounts: Record<string, number> = {};
    loadedPosts.forEach(p => {
      counts[p.id] = p.likes_count || 0;
      cCounts[p.id] = p.comments_count || 0;
    });
    setLikeCounts(counts);
    setCommentCounts(cCounts);

    if (userLikes && userLikes.length > 0) {
      const likesMap: Record<string, boolean> = {};
      (userLikes as any[]).forEach(like => likesMap[like.post_id] = true);
      setLikedPosts(likesMap);
    }

    setLoading(false);
  }

  async function loadMorePosts() {
    if (loadingMore || !hasMore || !church) return;
    setLoadingMore(true);
    const { data: more } = await supabase
      .from('church_posts')
      .select('*, author:profiles(full_name, avatar_url, username)')
      .eq('church_id', church.id)
      .order('created_at', { ascending: false })
      .range(posts.length, posts.length + PAGE_SIZE - 1);

    if (more && more.length > 0) {
      setPosts(prev => [...prev, ...more]);
      setHasMore(more.length === PAGE_SIZE);
      const counts: Record<string, number> = {};
      const cCounts: Record<string, number> = {};
      more.forEach((p: any) => {
        counts[p.id] = p.likes_count || 0;
        cCounts[p.id] = p.comments_count || 0;
      });
      setLikeCounts(prev => ({ ...prev, ...counts }));
      setCommentCounts(prev => ({ ...prev, ...cCounts }));
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Carregando feed...</div>;

  const handlePostSubmit = async (data: any) => {
    if (!currentUser || !church) return toast.error("Não foi possível publicar. Tente novamente.");

    const newPost: any = {
      church_id: church.id,
      author_id: currentUser.id,
      post_type: data.post_type || 'text',
      content: data.caption || data.content || '',
    };

    if (data.blob) {
      const fileExt = data.blob.type.split('/')[1] || (data.post_type === 'video' ? 'mp4' : 'jpg');
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('posts').upload(fileName, data.blob);
      if (uploadError) {
        toast.error(`Erro ao fazer upload: ${uploadError.message}`);
        setIsComposerOpen(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      newPost.media_url = publicUrlData.publicUrl;
    }

    const { data: insertedPost, error } = await supabase.from('church_posts').insert(newPost).select('*, author:profiles(full_name, avatar_url, username)').single();
    
    if (error) {
      toast.error("Erro ao criar publicação.");
      console.error(error);
    } else if (insertedPost) {
      setPosts(prev => [insertedPost, ...prev]);
      toast.success("Publicação criada!");
    }
    
    setIsComposerOpen(false);
  };
  
  const handleToggleLike = async (postId: string) => {
    if (!currentUser) {
      toast.error("Faça login para curtir.");
      return;
    }
    
    const isLiked = likedPosts[postId];
    
    // Otimista
    setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
    setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1) }));
    
    if (isLiked) {
      await supabase.from('church_post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      await supabase.rpc('decrement_church_post_likes', { p_post_id: postId });
    } else {
      await supabase.from('church_post_likes').insert({ post_id: postId, user_id: currentUser.id });
      await supabase.rpc('increment_church_post_likes', { p_post_id: postId });
    }
  };
  
  const toggleComments = async (postId: string) => {
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    
    if (!comments[postId]) {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      const { data } = await supabase
        .from('church_post_comments')
        .select('*, author:profiles(full_name, avatar_url, username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
        
      if (data) {
        setComments(prev => ({ ...prev, [postId]: data }));
      }
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddComment = async (postId: string, parentId: string | null = null) => {
    if (!currentUser) return toast.error("Faça login para comentar.");
    const text = parentId ? replyInput[parentId]?.trim() : commentInput[postId]?.trim();
    if (!text) return;
    
    const newComment = {
      post_id: postId,
      author_id: currentUser.id,
      content: text,
      parent_id: parentId
    };
    
    const { data, error } = await supabase.from('church_post_comments').insert(newComment).select('*, author:profiles(full_name, avatar_url, username)').single();
    if (error) {
      console.error("Erro ao comentar:", error);
      toast.error(`Erro: ${error.message}`);
    }
    
    if (!error && data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
      if (parentId) {
        setReplyInput(prev => ({ ...prev, [parentId]: '' }));
        setReplyingTo(prev => ({ ...prev, [postId]: null }));
      } else {
        setCommentInput(prev => ({ ...prev, [postId]: '' }));
      }
      setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      await supabase.rpc('increment_church_post_comments', { p_post_id: postId });
    }
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;
    const { error } = await supabase.from('church_posts').delete().eq('id', postId);
    if (error) {
      toast.error("Erro ao excluir publicação.");
      console.error(error);
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Publicação excluída.");
    }
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editPostContent.trim()) return toast.error("A publicação não pode ser vazia.");
    
    const { error } = await supabase.from('church_posts').update({ content: editPostContent }).eq('id', postId);
    if (error) {
      toast.error("Erro ao atualizar publicação.");
      console.error(error);
    } else {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editPostContent } : p));
      setEditingPostId(null);
      toast.success("Publicação atualizada.");
    }
  };

  const openComposer = (mode: 'text' | 'audio' | 'gallery') => {
    setComposerInitialMode(mode);
    setIsComposerOpen(true);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
      
      {/* Composer Section */}
      {isMember && (
        <>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm mb-6 flex gap-3 cursor-text">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <span className="text-xl">👤</span>
              )}
            </div>
            <div 
              onClick={() => openComposer('text')}
              className="flex-1 bg-muted rounded-full px-4 flex items-center text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
            >
              Escreva algo...
            </div>
            <div 
              onClick={() => openComposer('gallery')}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-whatsapp-teal transition-colors cursor-pointer"
            >
               <ImageIcon size={20} />
            </div>
            <div 
              onClick={() => openComposer('audio')}
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-whatsapp-teal transition-colors cursor-pointer"
            >
               <Mic size={20} />
            </div>
          </div>

          <UnifiedComposer 
            open={isComposerOpen} 
            onClose={() => setIsComposerOpen(false)} 
            initialMode={composerInitialMode}
            user={null}
            allowedModes={['text', 'audio', 'photo', 'gallery']}
            onSubmit={async (data: any) => { await handlePostSubmit(data); }}
          />
        </>
      )}

      <div className="flex items-center justify-between mb-4 mt-2">
        <h3 className="font-bold text-foreground">Atividade recente</h3>
        <Settings className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
      </div>

      {/* Feed Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Ainda não há publicações. Seja o primeiro a compartilhar!
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={post.author?.avatar_url || 'https://via.placeholder.com/40'} 
                    className="w-10 h-10 rounded-full border border-border object-cover" 
                  />
                  <div>
                    <p className="font-bold text-sm text-foreground flex items-center gap-2">
                      {post.author?.full_name} 
                      {currentUser?.id !== post.author_id && (
                        <span className="text-muted-foreground font-normal hover:underline cursor-pointer">• Seguir</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {moment(post.created_at).fromNow()} <Globe2 className="w-3 h-3 ml-1" />
                    </p>
                  </div>
                </div>
                
                {currentUser?.id === post.author_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-muted rounded-full outline-none">
                        <MoreVertical className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-card border-border rounded-xl shadow-lg">
                      <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => {
                        setEditingPostId(post.id);
                        setEditPostContent(post.content);
                      }}>
                        <Edit3 className="w-4 h-4" /> Editar publicação
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={() => handleDeletePost(post.id)}>
                        <Trash2 className="w-4 h-4" /> Excluir publicação
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {editingPostId === post.id ? (
                <div className="mt-2 mb-4">
                  <textarea 
                    className="w-full bg-muted text-foreground p-3 rounded-xl border border-transparent focus:border-whatsapp-teal outline-none resize-none min-h-[100px]"
                    value={editPostContent}
                    onChange={e => setEditPostContent(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => setEditingPostId(null)} className="px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-muted transition-colors text-muted-foreground">Cancelar</button>
                    <button onClick={() => handleSaveEdit(post.id)} className="px-4 py-1.5 rounded-full bg-whatsapp-teal text-white text-sm font-semibold hover:bg-whatsapp-tealLight transition-colors">Salvar</button>
                  </div>
                </div>
              ) : (
                <>
                  {post.content && <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">{post.content}</p>}
                  {post.media_url && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-border">
                      {post.post_type === 'video' ? (
                        <video src={post.media_url} controls className="w-full h-auto max-h-[500px] bg-black" />
                      ) : (
                        <img src={post.media_url} className="w-full h-auto max-h-[500px] object-cover" />
                      )}
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                <button 
                  onClick={() => handleToggleLike(post.id)}
                  className={cn(
                    "flex items-center gap-2 transition-colors text-sm font-semibold flex-1 justify-center py-1 rounded-lg hover:bg-muted",
                    likedPosts[post.id] ? "text-whatsapp-teal" : "text-muted-foreground hover:text-whatsapp-teal"
                  )}
                >
                  <Flame size={18} className={likedPosts[post.id] ? "fill-current" : ""} /> 
                  {likeCounts[post.id] > 0 ? `${likeCounts[post.id]} Curtidas` : 'Curtir'}
                </button>
                <button 
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-whatsapp-teal transition-colors text-sm font-semibold flex-1 justify-center py-1 rounded-lg hover:bg-muted"
                >
                  <MessageCircle size={18} className={openComments[post.id] ? "fill-current text-whatsapp-teal" : ""} /> 
                  {commentCounts[post.id] > 0 ? `${commentCounts[post.id]} Comentários` : 'Comentar'}
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copiado para compartilhar!");
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-whatsapp-teal transition-colors text-sm font-semibold flex-1 justify-center py-1 rounded-lg hover:bg-muted"
                >
                  <Share2 size={18} /> Compartilhar
                </button>
              </div>
              
              {/* Comentários Section */}
              {openComments[post.id] && (
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  {loadingComments[post.id] ? (
                    <div className="text-center text-sm text-muted-foreground py-2">Carregando comentários...</div>
                  ) : comments[post.id]?.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-2">Nenhum comentário ainda. Seja o primeiro!</div>
                  ) : (
                    <div className="space-y-1">
                      {comments[post.id]?.filter((c: any) => !c.parent_id).map((comment: any) => (
                        <CommentNode 
                          key={comment.id}
                          comment={comment}
                          allComments={comments[post.id] || []}
                          postId={post.id}
                          replyingTo={replyingTo}
                          setReplyingTo={setReplyingTo}
                          replyInput={replyInput}
                          setReplyInput={setReplyInput}
                          handleAddComment={handleAddComment}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Input novo comentário */}
                  <div className="flex gap-2 items-center mt-2">
                    <img 
                      src={currentUser?.avatar_url || 'https://via.placeholder.com/32'} 
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <input 
                      type="text" 
                      placeholder="Escreva um comentário..."
                      className="flex-1 min-w-0 bg-muted rounded-full px-4 py-2 text-sm text-foreground outline-none border border-transparent focus:border-whatsapp-teal transition-colors"
                      value={commentInput[post.id] || ''}
                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                    />
                    <button 
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentInput[post.id]?.trim()}
                      className="p-2 rounded-full bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Send size={16} className="ml-0.5" />
                    </button>
                  </div>
                </div>
              )}
              
            </div>
          ))
        )}
      </div>

      {/* ✅ Paginação: Carregar mais posts */}
      {hasMore && posts.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMorePosts}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-muted text-muted-foreground font-semibold rounded-xl hover:bg-muted/80 transition-colors disabled:opacity-50 text-sm"
          >
            {loadingMore ? 'Carregando...' : 'Ver mais publicações'}
          </button>
        </div>
      )}
    </div>
  );
}
