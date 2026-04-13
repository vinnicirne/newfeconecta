"use client";

import { useState, useEffect, useRef } from 'react';
import { Flame, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Repeat, Play, Pause, Bookmark, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CommentsSection from './CommentsSection';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import 'moment/locale/pt-br';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/verification-badge';

// Ensure moment is in PT-BR
moment.locale('pt-br');

export default function PostCard({ post, currentUser, onDeleted, onUpdated }: any) {
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState<string[]>(Array.isArray(post.likes) ? post.likes : []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showLikeAnim, setShowLikeAnim] = useState(false);

  // VIEWS FEATURE
  const [viewsCount, setViewsCount] = useState(Number(post.views_count) || 0);
  const hasViewedRef = useRef(false);

  useEffect(() => {
    setViewsCount(Number(post.views_count) || 0);
  }, [post.views_count]);

  const handlePlayMedia = async () => {
    if (hasViewedRef.current) return;
    hasViewedRef.current = true;
    
    setViewsCount(prev => prev + 1);

    try {
      await supabase.rpc('increment_view', { p_post_id: post.id });
      onUpdated?.({ ...post, views_count: viewsCount + 1 });
    } catch (e) {
      console.error("Erro ao computar visualização", e);
    }
  };

  const [repostsCount, setRepostsCount] = useState(Number(post.reposts_count) || 0);

  useEffect(() => {
    setRepostsCount(Number(post.reposts_count) || 0);
  }, [post.reposts_count]);

  const [isReposted, setIsReposted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userId = currentUser?.id;
  const isLiked = userId ? likes.includes(userId) : false;
  const isAuthor = post.author_id === userId;
  const isAdmin = currentUser?.role === 'admin';
  const isOwner = isAuthor || isAdmin;

  // Áudio
  const isAudio = post.post_type === 'audio' ||
    post.media_type === 'audio' ||
    post.media_url?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i);

  // Vídeo
  const isVideo = post.post_type === 'video' ||
    post.media_type === 'video' ||
    post.media_url?.match(/\.(mp4|webm|mov|mkv)/i);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        handlePlayMedia(); // Aciona o gatilho viral 
      }
      setIsPlaying(!isPlaying);
    }
  };

  const fmtTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const commentCount = Number(post.comments_count) || 0;
  const likeCount = likes?.length || 0;

  const checkIfSaved = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', userId)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const checkIfReposted = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('reposts')
      .select('id')
      .eq('post_id', post.id)
      .eq('profile_id', userId)
      .maybeSingle();
    setIsReposted(!!data);
  };

  const checkIfFollowing = async () => {
    if (!userId || isOwner || !post.author_id) return;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', post.author_id)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  useEffect(() => {
    checkIfReposted();
    checkIfSaved();
    checkIfFollowing();
  }, [post.id, userId]);

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast.error("Faça login para seguir"); return; }
    if (isOwner || !post.author_id) return;

    const oldFollowing = isFollowing;
    setIsFollowing(!oldFollowing);

    try {
      if (oldFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', post.author_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: userId, following_id: post.author_id });
        if (error) throw error;
      }
    } catch (err) {
      setIsFollowing(oldFollowing);
      toast.error('Erro ao atualizar seguidor.');
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast.error("Faça login para salvar"); return; }
    
    const oldSaved = isSaved;
    setIsSaved(!oldSaved);
    try {
      if (oldSaved) {
        const { error } = await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_posts').insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
    } catch (err) {
      setIsSaved(oldSaved);
      toast.error("Erro ao salvar publicação.");
    }
  };

  const toggleRepost = async () => {
    if (!userId) { toast.error("Faça login para republicar"); return; }

    const oldReposted = isReposted;
    const oldLocalCount = repostsCount;

    setIsReposted(!oldReposted);
    setRepostsCount(oldReposted ? Math.max(0, oldLocalCount - 1) : oldLocalCount + 1);

    try {
      if (oldReposted) {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reposts')
          .insert({ post_id: post.id, profile_id: userId });
        if (error) throw error;
      }
      onUpdated?.({ ...post, reposts_count: oldReposted ? Math.max(0, oldLocalCount - 1) : oldLocalCount + 1 });
    } catch (err) {
      console.error("Error toggling repost:", err);
      setIsReposted(oldReposted);
      setRepostsCount(oldLocalCount);
      toast.error("Erro ao processar republicação.");
    }
  };

  const toggleLike = async () => {
    if (!userId) { toast.error("Faça login para curtir"); return; }

    const oldLikes = [...likes];
    const newLikes = isLiked
      ? likes.filter((id: string) => id !== userId)
      : [...likes, userId];

    setLikes(newLikes);

    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', post.id);

      if (error) throw error;
      onUpdated?.({ ...post, likes: newLikes, likes_count: newLikes.length, views_count: viewsCount });
    } catch (err) {
      console.error("Error updating likes:", err);
      setLikes(oldLikes); // revert exactly back to old array
      toast.error("Não foi possível curtir a publicação");
    }
  };

  const handleDoubleClickLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      toggleLike();
    }
    // Sempre mostrar animação no double click para feedback visual
    setShowLikeAnim(true);
    setTimeout(() => setShowLikeAnim(false), 800);
  };

  const handleDelete = async () => {
    toast("Deseja excluir esta publicação?", {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            const { error } = await supabase
              .from('posts')
              .delete()
              .eq('id', post.id);

            if (error) throw error;

            toast.success("Publicação excluída!");
            onDeleted?.(post.id);
          } catch (err: any) {
            console.error("Error deleting post:", err);
            toast.error("Erro ao excluir publicação: " + err.message);
          }
        }
      }
    });
  };

  const handleShare = () => {
    const postUrl = window.location.origin + '/post/' + post.id;
    if (navigator.share) {
      navigator.share({ title: 'FéConecta Post', url: postUrl }).catch(console.error);
    } else {
      navigator.clipboard.writeText(postUrl);
      toast.success("Link copiado!");
    }
  };

  const renderContent = (content: string) => {
    if (!content) return null;

    const MAX_CHAR = 240;
    const shouldTruncate = content.length > MAX_CHAR && !isExpanded;
    const displayContent = shouldTruncate ? content.substring(0, MAX_CHAR) + '...' : content;

    const parts = displayContent.split(/(#[\wáàâãéèêíïóôõöúç-]+|@[\w.-]+|\n)/g);

    return (
      <>
        {parts.map((part: string, i: number) => {
          const trimmed = part.trim();
          if (part === '\n' || part === '\r\n') return <br key={i} />;

          if (trimmed.startsWith('#')) {
            const tag = trimmed.substring(1);
            return (
              <Link
                key={i}
                href={`/explore/${tag}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer font-medium"
              >
                {part}
              </Link>
            );
          }

          if (trimmed.startsWith('@')) {
            const username = trimmed.substring(1);
            return (
              <Link 
                key={i} 
                href={`/profile/${username}`} 
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="text-whatsapp-teal dark:text-whatsapp-green hover:underline font-bold"
              >
                {part}
              </Link>
            );
          }

          return part;
        })}

        {content.length > MAX_CHAR && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="text-whatsapp-teal dark:text-whatsapp-green font-bold ml-1 hover:underline text-xs uppercase"
          >
            {isExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-2xl mx-4 mb-4 shadow-sm overflow-hidden">
      {/* Header */}
      {post.is_repost && (
        <div className="px-4 pt-2 -mb-1 flex items-center gap-1.5 text-[10px] text-whatsapp-green font-bold uppercase tracking-wider">
          <Repeat className="w-3 h-3" />
          <span>{post.reposted_by_name || 'Alguém'} republicou</span>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile/${post.author_username}`} className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-gray-100 dark:border-white/10 hover:opacity-80 transition-opacity">
          {post.author_avatar ? (
            <img src={post.author_avatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white font-bold text-xs">
              {(post.author_name || 'U')[0]}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.author_username}`} className="block group/name">
            <p 
              className="text-sm font-bold leading-tight truncate flex items-center gap-1.5 transition-colors"
              style={{ color: post.is_verified ? '#ffffff' : undefined }}
            >
              {post.author_name}
                <VerificationBadge 
                  role={post.verification_label || 'Verificado'} 
                  size="sm" 
                  className="ml-1"
                />
            </p>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${post.author_username}`} className="text-[10px] text-whatsapp-teal dark:text-whatsapp-green font-medium hover:underline">
              @{post.author_username}
            </Link>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">•</span>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">
              {mounted ? moment(post.created_date || post.created_at).fromNow() : '...'}
            </p>
          </div>
        </div>

        {!isAuthor && (
          <button
            onClick={toggleFollow}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all active:scale-95",
              isFollowing
                ? "border-gray-300 dark:border-white/20 text-gray-400 dark:text-gray-500"
                : "border-whatsapp-teal text-whatsapp-teal dark:border-whatsapp-green dark:text-whatsapp-green hover:bg-whatsapp-teal hover:text-white dark:hover:bg-whatsapp-green dark:hover:text-whatsapp-dark"
            )}
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuItem onClick={() => toast.info("Edição em breve")} className="text-blue-500">
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ==================== CONTENT ==================== */}
      <div className="px-4 py-3">
        {/* Texto principal com Suporte a Background Premium */}
        {post.content && (
          <div 
            className={cn(
              "text-[15.2px] leading-relaxed whitespace-pre-wrap break-words transition-all mb-2",
              post.background && "min-h-[240px] flex items-center justify-center p-10 rounded-3xl m-1 text-center shadow-xl border border-white/5"
            )}
            style={{ background: post.background || undefined }}
          >
            <span className={cn(
              post.background ? "text-white text-2xl font-black drop-shadow-md" : "text-gray-900 dark:text-gray-100"
            )}>
              {renderContent(post.content)}
            </span>
          </div>
        )}

        {/* Imagem */}
        {post.media_url &&
          (post.post_type === 'image' ||
            post.post_type === 'photo' ||
            post.media_type === 'image') && (
            <div 
              className="rounded-2xl overflow-hidden mt-3 border border-white/10 cursor-zoom-in relative group"
              onClick={() => setLightboxUrl(post.media_url)}
              onDoubleClick={handleDoubleClickLike}
            >
              <img
                src={post.media_url}
                className="w-full h-auto object-cover max-h-[520px] transition-transform duration-500 group-hover:scale-[1.02]"
                alt="Imagem do post"
              />
              
              {/* Like Animation Overlay */}
              {showLikeAnim && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <Flame className="w-24 h-24 text-orange-500 fill-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-in zoom-in duration-300 animate-out fade-out fade-mode-forwards" />
                  <Flame className="absolute w-24 h-24 text-orange-500/50 animate-ping duration-700" />
                </div>
              )}
            </div>
          )}

        {/* Vídeo */}
        {post.media_url && isVideo && (
            <div 
              className="rounded-2xl overflow-hidden mt-3 max-h-[550px] bg-black flex justify-center relative group"
              onDoubleClick={handleDoubleClickLike}
            >
              <video
                controls
                className="w-full h-auto max-h-[550px]"
                src={post.media_url}
                onPlay={handlePlayMedia}
              />
              {/* Like Animation for Video */}
              {showLikeAnim && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <Flame className="w-24 h-24 text-orange-500 fill-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-in zoom-in spin-in duration-300" />
                </div>
              )}
            </div>
          )}

        {/* Áudio */}
        {isAudio && post.media_url && (
          <div className="bg-[#111b21] p-4 rounded-2xl border border-white/5 shadow-2xl mt-3 overflow-hidden relative group transition-all hover:bg-[#182229]">
            <style dangerouslySetInnerHTML={{
              __html: `
              @keyframes audio-wave-anim {
                0%, 100% { height: 6px; }
                50% { height: 24px; }
              }
              .wave-bar-anim { animation: audio-wave-anim 0.8s ease-in-out infinite; }
            `}} />

            <div className="flex items-center gap-4 relative z-10">
              <button
                onClick={toggleAudio}
                className="w-11 h-11 rounded-full bg-whatsapp-teal flex items-center justify-center shadow-lg shadow-whatsapp-teal/20 transition-transform active:scale-90 hover:scale-105"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white fill-white" /> : <Play className="w-5 h-5 text-white fill-white ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-[3px] h-10">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-[3px] rounded-full transition-all duration-300",
                      isPlaying ? "wave-bar-anim bg-whatsapp-teal" : "h-[6px] bg-whatsapp-teal/30"
                    )}
                    style={{
                      animationDelay: `${i * 0.05}s`,
                      backgroundColor: audioProgress > (i / 30) * 100 ? '#00A884' : undefined,
                      opacity: audioProgress > (i / 30) * 100 ? 1 : 0.3
                    }}
                  />
                ))}
              </div>

              <span className="text-[11px] font-mono text-gray-400 min-w-[38px] text-right">
                {mounted && audioRef.current ? fmtTime(audioRef.current.currentTime) : "0:00"}
              </span>
            </div>

            <audio
              ref={audioRef}
              src={post.media_url}
              onTimeUpdate={() => audioRef.current && setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)}
              onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Interactions */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-50 dark:border-white/5 mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-1.5 transition-all active:scale-125",
              isLiked ? "text-orange-500" : "text-gray-500 dark:text-gray-400"
            )}
          >
            <Flame className={cn("w-5 h-5", isLiked && "fill-orange-500")} />
            <span className="text-xs font-bold">{likes.length || 0}</span>
          </button>
 
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-whatsapp-teal transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-bold">{commentCount}</span>
          </button>
 
          <button
            onClick={toggleRepost}
            className={cn(
              "flex items-center gap-1.5 transition-all active:scale-125",
              isReposted ? "text-whatsapp-green" : "text-gray-500 dark:text-gray-400"
            )}
          >
            <Repeat className="w-5 h-5" />
            <span className="text-xs font-bold">{repostsCount}</span>
          </button>
 
          {(isAudio || isVideo) && (
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-white/10 pl-4 ml-1">
              <Eye className="w-5 h-5" />
              <span className="text-xs font-bold">{viewsCount}</span>
            </div>
          )}
        </div>
 
        <button
          onClick={toggleSave}
          className={cn(
            "flex items-center gap-1.5 transition-all active:scale-125",
            isSaved ? "text-whatsapp-teal" : "text-gray-500 dark:text-gray-400 font-bold"
          )}
        >
          <Bookmark className={cn("w-5 h-5", isSaved && "fill-whatsapp-teal")} />
          <span className="text-[10px] uppercase">{isSaved ? 'Salvo' : 'Salvar'}</span>
        </button>
      </div>

      {showComments && <CommentsSection postId={post.id} user={currentUser} />}

      {/* Lightbox / Media Expansion */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300"
          onClick={() => setLightboxUrl(null)}
        >
          {/* Top Bar: Author Info & Close */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                 <img src={post.author_avatar || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
               </div>
               <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{post.author_name}</span>
                    {post.is_verified && (
                      <VerificationBadge 
                        role={post.verification_label || 'Verificado'} 
                        size="xs" 
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-whatsapp-green font-bold uppercase tracking-tighter">@{post.author_username}</span>
               </div>
            </div>
            <button 
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10"
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
          
          <div className="relative max-w-full max-h-[80vh] flex items-center justify-center p-4">
            <img 
              src={lightboxUrl} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300 pointer-events-auto cursor-default"
              alt="Expanded view"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickLike(e); }}
            />
            
            {/* Double Click Like Animation in Lightbox */}
            {showLikeAnim && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Flame className="w-32 h-32 text-orange-500 fill-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.8)] animate-in zoom-in duration-300" />
                <Flame className="absolute w-32 h-32 text-orange-500/50 animate-ping duration-700" />
              </div>
            )}
          </div>

          {/* Floating Interaction Bar */}
          <div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center gap-8 shadow-2xl animate-in slide-in-from-bottom duration-500"
            onClick={(e) => e.stopPropagation()}
          >
             <button
                onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all active:scale-125",
                  isLiked ? "text-orange-500" : "text-white"
                )}
              >
                <Flame className={cn("w-6 h-6", isLiked && "fill-orange-500")} />
                <span className="text-[10px] font-bold">{likes.length || 0}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); setShowComments(true); }}
                className="flex flex-col items-center gap-1 text-white hover:text-whatsapp-teal transition-all"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-[10px] font-bold">{commentCount}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); toggleRepost(); }}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all active:scale-125",
                  isReposted ? "text-whatsapp-green" : "text-white"
                )}
              >
                <Repeat className="w-6 h-6" />
                <span className="text-[10px] font-bold">{repostsCount}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="flex flex-col items-center gap-1 text-white hover:text-whatsapp-teal transition-all"
              >
                <Share2 className="w-6 h-6" />
                <span className="text-[10px] font-bold italic uppercase tracking-tighter">Share</span>
              </button>

              <div className="w-px h-8 bg-white/10 mx-2" />

              <button
                onClick={(e) => { e.stopPropagation(); toggleSave(e); }}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all active:scale-125",
                  isSaved ? "text-whatsapp-teal" : "text-white"
                )}
              >
                <Bookmark className={cn("w-6 h-6", isSaved && "fill-whatsapp-teal")} />
                <span className="text-[10px] uppercase font-bold">{isSaved ? 'Salvo' : 'Save'}</span>
              </button>
          </div>
        </div>
      )}
    </div>
  );
}