"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Flame, Globe2, MoreVertical, MessageCircle, Share2, Edit3, Trash2, Send, Mic, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UnifiedComposer from "@/components/feed/UnifiedComposer";
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
          alt={comment.author?.full_name ? `Foto de ${comment.author.full_name}` : 'Foto do autor'}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
        <div className="flex-1">
          <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-sm inline-block">
            <p className="font-bold text-sm text-foreground">{comment.author?.full_name}</p>
            <p className="text-[15px] text-foreground break-words">{comment.content}</p>
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
            aria-label="Escreva uma resposta"
            name={`reply-${comment.id}`}
            autoComplete="off"
            placeholder="Escreva uma resposta..."
            className="flex-1 min-w-0 bg-muted rounded-full px-4 py-1.5 text-xs text-foreground outline-none border border-transparent focus:border-whatsapp-teal transition-colors"
            value={replyInput[comment.id] || ''}
            onChange={e => setReplyInput((prev: any) => ({ ...prev, [comment.id]: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddComment(postId, comment.id);
            }}
          />
          <button 
            type="button"
            onClick={() => handleAddComment(postId, comment.id)}
            aria-label="Enviar resposta"
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

function getPostsBucketPath(publicUrl?: string | null) {
  if (!publicUrl) return null;
  const marker = '/storage/v1/object/public/posts/';
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  try {
    return decodeURIComponent(publicUrl.slice(markerIndex + marker.length).split('?')[0]);
  } catch {
    return null;
  }
}

export default function ChurchProfile({ params }: { params: { slug: string } }) {
  // ✅ Dados do layout via contexto — zero re-fetch de church/user/member
  const { church, currentUser, isMember } = useChurch();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerInitialMode, setComposerInitialMode] = useState<'text' | 'audio' | 'gallery'>('text');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likingPosts, setLikingPosts] = useState<Record<string, boolean>>({});
  
  // Comments state
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, boolean>>({});
  
  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState<string>("");
  
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0); // Rastreia a página atual para evitar offset shift
  const feedRequestVersion = useRef(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (!church?.id) return;
    const requestId = ++feedRequestVersion.current;
    loadFeed(requestId);
    return () => {
      if (feedRequestVersion.current === requestId) feedRequestVersion.current += 1;
    };
  }, [church?.id, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const targetId = new URLSearchParams(window.location.search).get('post');
    if (!targetId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`post-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [loading, posts]);

  async function loadFeed(requestId = ++feedRequestVersion.current) {
    setLoading(true);
    setLoadError(null);
    setPage(0); // Reseta a página
    try {
      const postsQuery = supabase
        .from('church_posts')
        .select('*, author:profiles(full_name, avatar_url, username)')
        .eq('church_id', church.id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      const likesQuery = currentUser
        ? supabase.from('church_post_likes').select('post_id').eq('user_id', currentUser.id)
        : Promise.resolve({ data: [], error: null } as any);
      const sharedPostId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('post')
        : null;
      const sharedPostQuery = sharedPostId
        ? supabase
            .from('church_posts')
            .select('*, author:profiles(full_name, avatar_url, username)')
            .eq('church_id', church.id)
            .eq('id', sharedPostId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any);

      const [postsResult, likesResult, sharedPostResult] = await Promise.all([postsQuery, likesQuery, sharedPostQuery]);
      if (requestId !== feedRequestVersion.current) return;
      if (postsResult.error) throw postsResult.error;
      if (likesResult.error) throw likesResult.error;
      if (sharedPostResult.error) throw sharedPostResult.error;

      const loadedPosts = postsResult.data || [];
      const sharedPost = sharedPostResult.data;
      const visiblePosts = sharedPost && !loadedPosts.some((post: any) => post.id === sharedPost.id)
        ? [sharedPost, ...loadedPosts]
        : loadedPosts;
      setPosts(visiblePosts);
      setHasMore(loadedPosts.length === PAGE_SIZE);

      const counts: Record<string, number> = {};
      const cCounts: Record<string, number> = {};
      visiblePosts.forEach((post: any) => {
        counts[post.id] = post.likes_count || 0;
        cCounts[post.id] = post.comments_count || 0;
      });
      setLikeCounts(counts);
      setCommentCounts(cCounts);

      const likesMap: Record<string, boolean> = {};
      (likesResult.data || []).forEach((like: any) => { likesMap[like.post_id] = true; });
      setLikedPosts(likesMap);
    } catch (error) {
      if (requestId === feedRequestVersion.current) {
        console.error('[Feed da igreja] Erro ao carregar publicações:', error);
        setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar as publicações.');
        setPosts([]);
      }
    } finally {
      if (requestId === feedRequestVersion.current) setLoading(false);
    }
  }

  async function loadMorePosts() {
    if (loadingMore || !hasMore || !church) return;
    setLoadingMore(true);
    
    const nextPage = page + 1;
    const startOffset = nextPage * PAGE_SIZE;
    const endOffset = startOffset + PAGE_SIZE - 1;

    try {
      const { data: more, error } = await supabase
        .from('church_posts')
        .select('*, author:profiles(full_name, avatar_url, username)')
        .eq('church_id', church.id)
        .order('created_at', { ascending: false })
        .range(startOffset, endOffset);
      if (error) throw error;

      if (more && more.length > 0) {
        setPage(nextPage);
      // Evita duplicação caso um post que estava na página 1 escorregue para a página 2 (novo post no db)
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newUniquePosts = more.filter((p: any) => !existingIds.has(p.id));
        return [...prev, ...newUniquePosts];
      });
      
        setHasMore(more.length === PAGE_SIZE);
        const counts: Record<string, number> = {};
        const cCounts: Record<string, number> = {};
        more.forEach((post: any) => {
          counts[post.id] = post.likes_count || 0;
          cCounts[post.id] = post.comments_count || 0;
        });
        setLikeCounts(prev => ({ ...prev, ...counts }));
        setCommentCounts(prev => ({ ...prev, ...cCounts }));
      } else {
        setHasMore(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? `Não foi possível carregar mais publicações: ${error.message}` : 'Não foi possível carregar mais publicações.');
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <div role="status" aria-live="polite" className="py-20 text-center text-gray-400">Carregando feed…</div>;
  if (loadError) return (
    <div className="py-16 text-center text-muted-foreground" role="alert">
      <p className="mb-4">Não foi possível carregar as publicações.</p>
      <button type="button" onClick={() => loadFeed()} className="px-5 py-2.5 rounded-xl bg-whatsapp-teal text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">Tentar novamente</button>
    </div>
  );

  const handlePostSubmit = async (data: any) => {
    if (!currentUser || !church) {
      toast.error("Não foi possível publicar. Tente novamente.");
      return false;
    }

    const newPost: any = {
      church_id: church.id,
      author_id: currentUser.id,
      post_type: data.post_type || 'text',
      content: data.caption || data.content || '',
    };

    let uploadedFilePath: string | null = null;
    if (data.blob) {
      // Extrai a extensão pura, sem sufixo de codec (ex: 'webm;codecs=opus' → 'webm')
      const rawExt = data.blob.type.split('/')[1]?.split(';')[0];
      const fallbackExt = data.post_type === 'video' ? 'mp4' : data.post_type === 'audio' ? 'webm' : 'jpg';
      const fileExt = rawExt || fallbackExt;
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('posts').upload(fileName, data.blob);
      if (uploadError) {
        toast.error(`Erro ao fazer upload: ${uploadError.message}`);
        return false; // mantém o composer aberto para uma nova tentativa
      }
      uploadedFilePath = fileName;
      const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      newPost.media_url = publicUrlData.publicUrl;
    }

    const { data: insertedPost, error } = await supabase.from('church_posts').insert(newPost).select('*, author:profiles(full_name, avatar_url, username)').single();
    
    if (error) {
      if (uploadedFilePath) {
        await supabase.storage.from('posts').remove([uploadedFilePath]);
      }
      toast.error("Erro ao criar publicação.");
      console.error(error);
      return false; // mantém o composer aberto em caso de erro
    }
    
    if (insertedPost) {
      setPosts(prev => [insertedPost, ...prev]);
      toast.success("Publicação criada!");
    }
    
    setIsComposerOpen(false); // ← fecha apenas no sucesso
    return true;
  };
  
  const handleToggleLike = async (postId: string) => {
    if (!currentUser) {
      toast.error("Faça login para curtir.");
      return;
    }
    if (likingPosts[postId]) return;
    
    const isLiked = likedPosts[postId];
    setLikingPosts(prev => ({ ...prev, [postId]: true }));
    
    // Otimista
    setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
    setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? -1 : 1)) }));
    
    try {
      const result = isLiked
        ? await supabase.from('church_post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
        : await supabase.from('church_post_likes').insert({ post_id: postId, user_id: currentUser.id });
      if (result.error) throw result.error;
    } catch (error) {
      setLikedPosts(prev => ({ ...prev, [postId]: isLiked }));
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? 1 : -1)) }));
      toast.error(error instanceof Error ? `Não foi possível atualizar a curtida: ${error.message}` : 'Não foi possível atualizar a curtida. Tente novamente.');
    } finally {
      setLikingPosts(prev => ({ ...prev, [postId]: false }));
    }
  };
  
  const loadComments = async (postId: string) => {
    if (loadingComments[postId]) return;
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('church_post_comments')
        .select('*, author:profiles(full_name, avatar_url, username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(prev => ({ ...prev, [postId]: data || [] }));
      setCommentErrors(prev => ({ ...prev, [postId]: false }));
    } catch (error) {
      setCommentErrors(prev => ({ ...prev, [postId]: true }));
      toast.error(error instanceof Error ? `Não foi possível carregar os comentários: ${error.message}` : 'Não foi possível carregar os comentários.');
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = async (postId: string) => {
    const shouldOpen = !openComments[postId];
    setOpenComments(prev => ({ ...prev, [postId]: shouldOpen }));
    if (shouldOpen && !comments[postId]) await loadComments(postId);
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
    }
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;
    const postToDelete = posts.find((post) => post.id === postId);
    const { error } = await supabase.from('church_posts').delete().eq('id', postId);
    if (error) {
      toast.error("Erro ao excluir publicação.");
      console.error(error);
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId));
      const mediaPath = getPostsBucketPath(postToDelete?.media_url);
      if (mediaPath) {
        const { error: mediaError } = await supabase.storage.from('posts').remove([mediaPath]);
        if (mediaError) toast.warning('Publicação excluída, mas não foi possível remover o arquivo de mídia.');
      }
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

  const handleSharePost = async (postId: string) => {
    const url = new URL(`/igreja/${params.slug}`, window.location.origin);
    url.searchParams.set('post', postId);
    url.hash = `post-${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: church?.name || 'Publicação da igreja', url: url.toString() });
        return;
      }
      await navigator.clipboard.writeText(url.toString());
      toast.success('Link da publicação copiado.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error('Não foi possível compartilhar. Verifique a permissão de área de transferência.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
      
      {/* Composer Section */}
      {isMember && (
        <>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm mb-6 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <span className="text-xl">👤</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => openComposer('text')}
              className="flex-1 min-w-0 text-left bg-muted rounded-full px-4 flex items-center text-muted-foreground text-sm hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal"
            >
              Escreva algo...
            </button>
            <button
              type="button"
              onClick={() => openComposer('gallery')}
              aria-label="Adicionar foto ou vídeo"
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-whatsapp-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal"
            >
               <ImageIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => openComposer('audio')}
              aria-label="Gravar áudio"
              className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-whatsapp-teal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal"
            >
               <Mic size={20} />
            </button>
          </div>

          <UnifiedComposer 
            open={isComposerOpen} 
            onClose={() => setIsComposerOpen(false)} 
            initialMode={composerInitialMode}
            user={currentUser}
            allowedModes={['text', 'audio', 'photo', 'gallery']}
            onSubmit={handlePostSubmit}
          />
        </>
      )}

      <div className="flex items-center justify-between mb-4 mt-2">
        <h3 className="font-bold text-foreground">Atividade recente</h3>
      </div>

      {/* Feed Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Ainda não há publicações. Seja o primeiro a compartilhar!
          </div>
        ) : (
          posts.map((post) => (
            <div id={`post-${post.id}`} key={post.id} className="scroll-mt-24 bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={post.author?.avatar_url || 'https://via.placeholder.com/40'} 
                    alt={post.author?.full_name ? `Foto de ${post.author.full_name}` : 'Foto do autor'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full border border-border object-cover" 
                  />
                  <div>
                    <p className="font-bold text-sm text-foreground flex items-center gap-2">
                      {post.author?.full_name} 
                      {currentUser?.id !== post.author_id && post.author?.username && (
                        <Link href={`/profile/${post.author.username}`} className="text-muted-foreground font-normal hover:underline">Ver perfil</Link>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(post.created_at))} <Globe2 aria-hidden="true" className="w-3 h-3 ml-1" />
                    </p>
                  </div>
                </div>
                
                {currentUser?.id === post.author_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button aria-label="Mais opções da publicação" className="p-1 hover:bg-muted rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">
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
                    aria-label="Editar publicação"
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
                        <video src={post.media_url} controls playsInline preload="metadata" aria-label={`Vídeo de ${post.author?.full_name || 'membro da igreja'}`} className="w-full h-auto max-h-[500px] bg-black" />
                      ) : post.post_type === 'audio' ? (
                        <div className="p-6 bg-muted/30 flex justify-center">
                          <audio src={post.media_url} controls preload="metadata" aria-label={`Áudio de ${post.author?.full_name || 'membro da igreja'}`} className="w-full max-w-md" />
                        </div>
                      ) : (
                        <img src={post.media_url} alt={post.content || `Imagem de ${post.author?.full_name || 'membro da igreja'}`} width={1200} height={900} loading="lazy" className="w-full h-auto max-h-[500px] object-cover" />
                      )}
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                <button 
                  onClick={() => handleToggleLike(post.id)}
                  disabled={!!likingPosts[post.id]}
                  aria-pressed={!!likedPosts[post.id]}
                  aria-label={likedPosts[post.id] ? 'Remover curtida' : 'Curtir publicação'}
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
                  aria-expanded={!!openComments[post.id]}
                  aria-label={openComments[post.id] ? 'Fechar comentários' : 'Abrir comentários'}
                  className="flex items-center gap-2 text-muted-foreground hover:text-whatsapp-teal transition-colors text-sm font-semibold flex-1 justify-center py-1 rounded-lg hover:bg-muted"
                >
                  <MessageCircle size={18} className={openComments[post.id] ? "fill-current text-whatsapp-teal" : ""} /> 
                  {commentCounts[post.id] > 0 ? `${commentCounts[post.id]} Comentários` : 'Comentar'}
                </button>
                <button
                  onClick={() => handleSharePost(post.id)}
                  aria-label="Compartilhar publicação"
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
                  ) : commentErrors[post.id] ? (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      <p className="mb-2">Comentários indisponíveis.</p>
                      <button type="button" onClick={() => loadComments(post.id)} className="underline underline-offset-2">Tentar novamente</button>
                    </div>
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
                      alt=""
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <input 
                      type="text" 
                      aria-label="Escreva um comentário"
                      name={`comment-${post.id}`}
                      autoComplete="off"
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
                      type="button"
                      aria-label="Enviar comentário"
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
