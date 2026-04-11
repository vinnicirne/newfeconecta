"use client";

import { useState, useEffect } from 'react';
import { Flame, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Repeat, Play, Pause, Bookmark } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CommentsSection from './CommentsSection';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import 'moment/locale/pt-br';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRef } from 'react';

// Ensure moment is in PT-BR
moment.locale('pt-br');

export default function PostCard({ post, currentUser, onDeleted, onUpdated }: any) {
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState<string[]>(post.likes || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const isAudio = post.post_type === 'audio' || post.media_type === 'audio' || post.media_url?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus)/i);
    if (isAudio) {
      console.log('🔊 Áudio Detectado:', { id: post.id, type: post.post_type, med: post.media_type, url: post.media_url });
    }
  }, [post.id]);

  console.log(`Post [${post.id}] media_url:`, post.media_url);

  const userId = currentUser?.id || currentUser?.email;
  const isLiked = userId ? likes.includes(userId) : false;
  const isOwner = post.author_id === currentUser?.email
    || post.author_id === currentUser?.id
    || currentUser?.role === 'admin';

  const [repostsCount, setRepostsCount] = useState(Number(post.reposts_count) || 0);
  const [isReposted, setIsReposted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
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
    if (!currentUser) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', currentUser.id)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const checkIfReposted = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('reposts')
      .select('id')
      .eq('post_id', post.id)
      .eq('profile_id', currentUser.id)
      .maybeSingle();
    setIsReposted(!!data);
  };

  useEffect(() => {
    checkIfReposted();
    checkIfSaved();
  }, [post.id, currentUser]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    const oldSaved = isSaved;
    setIsSaved(!oldSaved);
    try {
      if (oldSaved) {
        await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUser.id);
      } else {
        await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUser.id });
      }
    } catch (err) {
      setIsSaved(oldSaved);
      toast.error("Erro ao salvar publicação.");
    }
  };

  const toggleRepost = async () => {
    if (!currentUser) return;

    const oldReposted = isReposted;
    const oldLocalCount = repostsCount;

    // Optimistic UI
    setIsReposted(!oldReposted);
    setRepostsCount(oldReposted ? oldLocalCount - 1 : oldLocalCount + 1);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (oldReposted) {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reposts')
          .insert({ post_id: post.id, profile_id: user.id });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error toggling repost:", err);
      setIsReposted(oldReposted);
      setRepostsCount(oldLocalCount);
      toast.error("Erro ao processar republicação.");
    }
  };

  const toggleLike = async () => {
    if (!currentUser) return;

    // Usamos o ID do usuário para maior consistência
    const userId = currentUser.id || currentUser.email;
    const newLikes = isLiked ? likes.filter(e => e !== userId) : [...likes, userId];

    // Atualização local imediata (Optimistic UI)
    setLikes(newLikes);

    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', post.id);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating likes:", err);
      // Revertemos em caso de erro
      setLikes(likes);
    }
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
    const postUrl = window.location.origin + '/admin/feed/post/' + post.id;
    if (navigator.share) {
      navigator.share({
        title: 'FéConecta Post',
        url: postUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(postUrl);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const renderContent = (content: string) => {
    if (!content) return null;

    const MAX_CHAR = 240;
    const shouldTruncate = content.length > MAX_CHAR && !isExpanded;
    const displayContent = shouldTruncate ? content.substring(0, MAX_CHAR) + '...' : content;

    // Divide o texto mantendo as quebras de linha e detectando hashtags/mensões
    const parts = displayContent.split(/(#[\wáàâãéèêíïóôõöúç]+|@[\wáàâãéèêíïóôõöúç]+|\n)/g);

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
                className="text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer font-medium"
              >
                {part}
              </Link>
            );
          }

          if (trimmed.startsWith('@')) {
            const username = trimmed.substring(1);
            return (
              <a key={i} href={`/profile/${username}`} className="text-whatsapp-teal dark:text-whatsapp-green hover:underline font-bold">
                {part}
              </a>
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
    <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-2xl mx-4 mb-4 shadow-sm overflow-hidden whatsapp-shadow">
      {/* Header */}
      {post.is_repost && (
        <div className="px-4 pt-2 -mb-1 flex items-center gap-1.5 text-[10px] text-whatsapp-green font-bold uppercase tracking-wider">
          <Repeat className="w-3 h-3" />
          <span>{post.reposted_by_name || 'Alguém'} republicou</span>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-gray-100 dark:border-white/10">
          {post.author_avatar
            ? <img src={post.author_avatar} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white font-bold text-xs">{(post.author_name || 'U')[0]}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate dark:text-white">{post.author_name}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-whatsapp-teal dark:text-whatsapp-green font-medium">@{post.author_username}</p>
            <span className="text-[10px] text-gray-400">•</span>
            <p className="text-[10px] text-gray-500 font-medium">{mounted ? moment(post.created_date).fromNow() : '...'}</p>
          </div>
        </div>

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

      {/* Content */}
      <div className="px-4 py-2">
        {post.post_type === 'text' && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: post.background || 'transparent',
              color: post.background ? 'white' : 'inherit'
            }}
          >
            <div className={cn(
              "text-lg font-bold leading-relaxed",
              post.background ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}>
              {renderContent(post.content)}
            </div>
          </div>
        )}

        {(post.post_type === 'image' || post.post_type === 'photo') && post.media_url && !post.media_url.startsWith('blob:') && (
          <div className="rounded-2xl overflow-hidden mb-2">
            <img src={post.media_url} className="w-full h-auto object-cover max-h-[500px]" alt="" />
          </div>
        )}

        {post.post_type === 'video' && post.media_url && (
          <div className="rounded-2xl overflow-hidden mb-2 bg-black aspect-[9/16] flex items-center justify-center relative">
            <video
              controls
              autoPlay
              muted
              loop
              playsInline
              webkit-playsinline="true"
              preload="auto"
              disablePictureInPicture
              controlsList="nopictureinpicture"
              className="w-full h-full object-cover"
            >
              <source src={post.media_url} />
              Seu navegador não suporta vídeos.
            </video>
          </div>
        )}

        {/* Áudio - Player Moderno com Waveform Vibrante */}
        {post.media_url && (post.post_type === 'audio' || post.media_type === 'audio' || post.media_url.match(/\.(mp3|wav|m4a|ogg|aac|weba)(\?|$)/i)) && (
          <div className="bg-[#111b21] p-4 rounded-2xl border border-white/5 shadow-2xl mt-2 overflow-hidden relative group transition-all hover:bg-[#182229]">
            <style dangerouslySetInnerHTML={{ __html: `
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
              isLiked ? "text-orange-500" : "text-gray-400"
            )}
          >
            <Flame className={cn("w-5 h-5", isLiked && "fill-orange-500")} />
            <span className="text-xs font-bold">{likes.length || 0}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-whatsapp-teal transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-bold">{post.comments_count || 0}</span>
          </button>

          <button
            onClick={toggleRepost}
            className={cn(
              "flex items-center gap-1.5 transition-all active:scale-125",
              isReposted ? "text-whatsapp-green" : "text-gray-400"
            )}
          >
            <Repeat className="w-5 h-5" />
            <span className="text-xs font-bold">{repostsCount}</span>
          </button>
        </div>

        <button
          onClick={toggleSave}
          className={cn(
            "flex items-center gap-1.5 transition-all active:scale-125",
            isSaved ? "text-whatsapp-teal" : "text-gray-400 font-bold"
          )}
        >
          <Bookmark className={cn("w-5 h-5", isSaved && "fill-whatsapp-teal")} />
          <span className="text-[10px] uppercase">{isSaved ? 'Salvo' : 'Salvar'}</span>
        </button>
      </div>

      {showComments && (
        <CommentsSection postId={post.id} user={currentUser} />
      )}
    </div>
  );
}
