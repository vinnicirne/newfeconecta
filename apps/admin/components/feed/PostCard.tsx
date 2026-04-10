"use client";

import { useState } from 'react';
import { Flame, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Repeat } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CommentsSection from './CommentsSection';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import 'moment/locale/pt-br';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Ensure moment is in PT-BR
moment.locale('pt-br');

export default function PostCard({ post, currentUser, onDeleted, onUpdated }: any) {
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState<string[]>(post.likes || []);
  const [isReposted, setIsReposted] = useState(false);
  
  console.log(`Post [${post.id}] media_url:`, post.media_url);
  
  const isLiked = likes.includes(currentUser?.email);
  const isOwner = post.author_id === currentUser?.email
    || post.author_id === currentUser?.id
    || currentUser?.role === 'admin';

  const toggleLike = async () => {
    const newLikes = isLiked ? likes.filter(e => e !== currentUser.email) : [...likes, currentUser.email];
    setLikes(newLikes);
    console.log("Post liked locally");
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
    
    // Divide o texto mantendo as quebras de linha e detectando hashtags/mensões
    const parts = content.split(/(\n|\r\n|[\s]+(?:#|@)[\wáàâãéèêíïóôõöúç]+)/g);

    return parts.map((part, i) => {
      const trimmed = part.trim();
      if (part === '\n' || part === '\r\n') return <br key={i} />;
      
      if (trimmed.startsWith('#')) {
        return (
          <span key={i} className="text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer font-medium">
            {part}
          </span>
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
    });
  };

  return (
    <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-2xl mx-4 mb-4 shadow-sm overflow-hidden whatsapp-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-gray-100 dark:border-white/10">
          {post.author_avatar
            ? <img src={post.author_avatar} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white font-bold text-xs">{(post.author_name || 'U')[0]}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate dark:text-white">{post.author_name}</p>
          <p className="text-[10px] text-gray-500 font-medium">{moment(post.created_date).fromNow()}</p>
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
              <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
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
            <p className={cn(
              "text-lg font-bold leading-relaxed",
              post.background ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}>
              {renderContent(post.content)}
            </p>
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

        {post.post_type === 'audio' && post.media_url && (
          <div className="bg-gray-50 dark:bg-whatsapp-dark p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-whatsapp-teal/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-whatsapp-teal" />
             </div>
             <audio src={post.media_url} controls className="flex-1 h-8" />
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
            onClick={() => setIsReposted(!isReposted)}
            className={cn(
              "flex items-center gap-1.5 transition-all",
              isReposted ? "text-whatsapp-green" : "text-gray-400"
            )}
          >
            <Repeat className="w-5 h-5" />
            <span className="text-xs font-bold">{post.reposts_count || 0}</span>
          </button>
        </div>

        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 text-gray-400 hover:text-whatsapp-teal transition-all"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-xs font-bold">{post.shares_count || 0}</span>
        </button>
      </div>

      {showComments && (
        <CommentsSection postId={post.id} user={currentUser} />
      )}
    </div>
  );
}
