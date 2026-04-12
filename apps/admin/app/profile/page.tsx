"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Grid, 
  ChevronDown, 
  Plus, 
  Camera, 
  Globe, 
  Instagram, 
  MessageCircle, 
  MessageSquare, 
  Linkedin, 
  Youtube, 
  Settings2, 
  UserSquare2, 
  PlaySquare, 
  Flame, 
  Bookmark, 
  ArrowLeft, 
  Menu, 
  LogOut, 
  Mic, 
  Music, 
  X, 
  Heart,
  ShieldCheck,
  Check,
  Share2,
  Copy,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ImageCropperModal } from "@/components/profile/ImageCropperModal";
import { CreateHighlightModal } from "@/components/profile/CreateHighlightModal";
import { toast } from "sonner";
import PostCard from "@/components/feed/PostCard";
import StoryViewer from "@/components/feed/StoryViewer";
import StoryCreator from "@/components/feed/StoryCreator";
import { VerificationModal } from "@/components/profile/VerificationModal";
import { VerificationBadge } from "@/components/verification-badge";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'tagged' | 'lumes' | 'likes' | 'saved'>('grid');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [isHighlightModalOpen, setIsHighlightModalOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<any | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cropper States
  const [cropperFile, setCropperFile] = useState<string | null>(null);
  const [cropperConfig, setCropperConfig] = useState<{
    aspect: number;
    title: string;
    isCircular: boolean;
    type: 'avatar' | 'banner';
  } | null>(null);

  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [connectionsType, setConnectionsType] = useState<'followers' | 'following'>('followers');
  const [connectionsData, setConnectionsData] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
    loadUserStories();
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('author_id', authUser.id)
      .eq('is_highlight', true)
      .order('created_at', { ascending: false });

    if (data) {
      // Agrupamento por título
      const groups: Record<string, any> = {};
      data.forEach(story => {
        const title = story.highlight_title || 'Destaque';
        if (!groups[title]) {
          groups[title] = {
            id: story.id,
            title: title,
            cover_url: story.highlight_cover_url || story.media_url,
            stories: []
          };
        }
        groups[title].stories.push(story);
      });
      setHighlights(Object.values(groups));
    }
  };

  const loadUserStories = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('author_id', authUser.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (data) setUserStories(data);
  };

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      router.push('/login');
      return;
    }

    const userId = authUser.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser(profile);
      // Verifica se segue o perfil
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', profile.id)
        .maybeSingle();
      setIsFollowing(!!follow);

    } else {
      // Perfil não encontrado no banco
      toast.error("Perfil não encontrado. Por favor, complete seu cadastro.");
    }
    setLoading(false);
    fetchHighlights();
    fetchUserPosts(userId);
    fetchLikedPosts(userId);
    fetchSavedPosts(userId);
  };

  const fetchConnections = async (type: 'followers' | 'following', profileId: string) => {
    setConnectionsType(type);
    setIsConnectionsOpen(true);
    setConnectionsData([]);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      const query = supabase.from('follows').select('follower_id, following_id');
      if (type === 'followers') query.eq('following_id', profileId);
      else query.eq('follower_id', profileId);

      const { data: follows } = await query;
      if (!follows) return;

      const userIds = follows.map(f => type === 'followers' ? f.follower_id : f.following_id);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        if (profiles && authUser) {
          // Verifica quem o usuário logado também segue (em comum)
          const { data: myFollowing } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', authUser.id);
            
          const myFollowSet = new Set(myFollowing?.map(m => m.following_id) || []);
          
          const enriched = profiles.map(p => ({
            ...p,
            is_common: myFollowSet.has(p.id)
          }));
          
          setConnectionsData(enriched);
        } else if (profiles) {
          setConnectionsData(profiles);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar conexões:", err);
    }
  };

  const toggleFollow = async () => {
    if (!user) return;
    const authId = (await supabase.auth.getUser()).data.user?.id;
    if (!authId) return;

    const oldFollowing = isFollowing;
    setIsFollowing(!oldFollowing);

    try {
      if (oldFollowing) {
        const { error } = await supabase.from('follows').delete()
          .eq('follower_id', authId)
          .eq('following_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: authId,
          following_id: user.id
        });
        if (error) throw error;
      }
    } catch (err) {
      setIsFollowing(oldFollowing);
      toast.error("Erro ao processar seguimento");
    }
  };

  const fetchSavedPosts = async (userId: string) => {
    try {
      const { data: savedData } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', userId);

      if (savedData && savedData.length > 0) {
        const ids = savedData.map(s => s.post_id);
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: false });

        if (posts) setSavedPosts(posts);
      } else {
        setSavedPosts([]);
      }
    } catch (err) {
      console.error("Erro ao buscar salvos:", err);
    }
  };

  const fetchLikedPosts = async (userId: string) => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .contains('likes', [userId])
      .order('created_at', { ascending: false });

    if (data) setLikedPosts(data);
  };

  const fetchUserPosts = async (userId: string) => {
    // 1. Busca posts autorais
    const { data: authored } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId);

    // 2. Busca IDs de posts que o usuário republicou
    const { data: reposts } = await supabase
      .from('reposts')
      .select('post_id')
      .eq('profile_id', userId);

    const repostIds = reposts?.map(r => r.post_id) || [];
    let allPosts = authored || [];

    if (repostIds.length > 0) {
      const { data: shared } = await supabase
        .from('posts')
        .select('*')
        .in('id', repostIds);

      if (shared) {
        const sharedFiltered = shared.filter(s => !allPosts.some(a => a.id === s.id));
        allPosts = [...allPosts, ...sharedFiltered];
      }
    }

    setUserPosts(allPosts.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
  };



  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setCropperFile(imageUrl);
    setCropperConfig({
      type,
      aspect: type === 'avatar' ? 1 : 16 / 6,
      title: type === 'avatar' ? 'Recortar Foto de Perfil' : 'Ajustar Banner',
      isCircular: type === 'avatar'
    });
  };

  const onCropDone = async (blob: Blob) => {
    if (!cropperConfig || !user?.id) return;

    const type = cropperConfig.type;
    const fileName = `${type}_${user.id}_${Date.now()}.jpg`;

    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      const field = type === 'avatar' ? 'avatar_url' : 'banner_url';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [field]: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser((prev: any) => ({ ...prev, [field]: publicUrl }));

      // Cleanup
      if (cropperFile) URL.revokeObjectURL(cropperFile);
      setCropperFile(null);
      setCropperConfig(null);

    } catch (err: any) {
      alert(`Erro no upload (${type}): ` + err.message);
    }
  };

  const formatExternalUrl = (url: string, type?: string) => {
    if (!url) return "#";
    let formatted = url.trim();

    // Especial para WhatsApp
    if (type === 'whatsapp' && !formatted.includes('http')) {
      const cleanNumber = formatted.replace(/\D/g, '');
      return `https://wa.me/${cleanNumber}`;
    }

    // Se for apenas o usuário (não tem pontos ou barras), monta a URL da rede
    if (!formatted.includes('.') && !formatted.includes('/')) {
      if (type === 'instagram') return `https://instagram.com/${formatted}`;
      if (type === 'youtube') return `https://youtube.com/@${formatted}`;
      if (type === 'linkedin') return `https://linkedin.com/in/${formatted}`;
    }

    if (!formatted.startsWith("http") && formatted.length > 0) {
      return `https://${formatted}`;
    }
    return formatted;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen pb-20 max-w-2xl mx-auto border-x">
      {/* Banner Section */}
      <div className="relative h-48 w-full bg-gray-900 overflow-hidden group">
        {user?.banner_url ? (
          <img src={user.banner_url} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal/20 via-black to-whatsapp-green/20" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <label className="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/20 transition-all active:scale-95">
            <Camera className="w-6 h-6 text-white" />
            <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'banner')} accept="image/*" />
          </label>
        </div>
      </div>

      {/* Top Header (Overlay style) */}
      <div className="flex items-center justify-between px-4 py-4 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-white/10 rounded-lg transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity">
            <h1 className="text-xl font-bold tracking-tight">{user?.username || 'user'}</h1>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={() => setIsHighlightModalOpen(true)}
            className="p-1 hover:bg-white/10 rounded-lg transition-all"
            title="Criar novo Destaque"
          >
            <Plus className="w-6 h-6" />
          </button>
          <button
            onClick={handleLogout}
            className="p-1 hover:bg-white/10 rounded-lg text-red-500 transition-all"
            title="Sair da conta"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Profile Header Stats */}
      <div className="px-5 -mt-12 relative z-10 pb-2">
        <div className="flex items-center justify-between gap-4 mb-6 pt-12">
          {/* Avatar with Story Ring style */}
          <div className="relative group">
            <div
              onClick={() => {
                if (userStories.length > 0) setIsStoryViewerOpen(true);
                else setIsStoryCreatorOpen(true);
              }}
              className={cn(
                "w-[100px] h-[100px] rounded-[32px] p-[3px] cursor-pointer transition-all active:scale-95",
                userStories.length > 0 ? "bg-gradient-to-tr from-whatsapp-teal to-whatsapp-green shadow-[0_0_15px_rgba(37,211,102,0.4)]" : "bg-white dark:bg-black"
              )}
            >
              <div className="w-full h-full rounded-[28px] border-4 border-white dark:border-black overflow-hidden bg-white dark:bg-gray-800 shadow-xl">
                <img src={user?.avatar_url || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
              </div>
            </div>
            <label
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 right-0 w-7 h-7 bg-whatsapp-green rounded-xl border-4 border-black flex items-center justify-center scale-95 hover:scale-105 transition-transform cursor-pointer"
            >
              <Plus className="w-5 h-5 text-whatsapp-dark font-black" />
              <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'avatar')} accept="image/*" />
            </label>
          </div>

          <div className="flex-1 flex justify-around text-center pt-8">
            <div className="flex flex-col cursor-default">
              <span className="font-bold text-lg leading-none dark:text-white text-gray-900">{userPosts.length || 0}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Publicações</span>
            </div>
            <button 
              onClick={() => fetchConnections('followers', user.id)}
              className="flex flex-col hover:opacity-70 active:scale-95 transition-all"
            >
              <span className="font-bold text-lg leading-none dark:text-white text-gray-900">{user?.followers_count?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Seguidores</span>
            </button>
            <button 
              onClick={() => fetchConnections('following', user.id)}
              className="flex flex-col hover:opacity-70 active:scale-95 transition-all"
            >
              <span className="font-bold text-lg leading-none dark:text-white text-gray-900">{user?.following_count?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Seguindo</span>
            </button>
          </div>
        </div>

        {/* Info & Bio */}
        <div className="space-y-0.5 mb-6 text-gray-800 dark:text-gray-100">
          <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
            {user?.full_name}
            {user?.is_verified && (
              <VerificationBadge 
                role={user.verification_label || 'Verificado'} 
                size="md"
              />
            )}
          </h2>
          <div className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-100/90 leading-relaxed font-medium">
            {(() => {
              const content = user?.bio;
              if (!content) return null;
              const parts = content.split(/(#[\wáàâãéèêíïóôõöúç]+|@[\wáàâãéèêíïóôõöúç]+|\n)/g);
              return parts.map((part: string, i: number) => {
                const trimmed = part.trim();
                if (part === '\n') return <br key={i} />;
                if (trimmed.startsWith('#')) {
                  const tag = trimmed.substring(1);
                  return <Link key={i} href={`/explore/${tag}`} className="text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer font-medium">{part}</Link>;
                }
                if (trimmed.startsWith('@')) {
                  return <a key={i} href={`/profile/${trimmed.substring(1)}`} className="text-whatsapp-teal dark:text-whatsapp-green hover:underline font-bold">{part}</a>;
                }
                return part;
              });
            })()}
          </div>
          {user?.website_url && (
            <a href={user.website_url} className="text-sm text-blue-400 font-medium hover:underline block pt-1">
              {user.website_url.replace('https://', '')}
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 py-2 rounded-xl text-sm font-bold transition-all border border-black/5 dark:border-white/5 active:scale-95 uppercase tracking-wide text-gray-900 dark:text-white"
          >
            Editar Perfil
          </button>
 
          <button
            onClick={() => window.location.href = '/messages'}
            className="flex-1 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center gap-2 rounded-xl transition-all border border-black/5 dark:border-white/5 active:scale-95 text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white"
            title="Mensagens"
          >
            <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-300" />
            Chat
          </button>
 
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="w-10 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center rounded-xl transition-all border border-black/5 dark:border-white/5 active:scale-95 text-gray-900 dark:text-white focus:outline-none">
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                className="z-[60] min-w-[200px] bg-white dark:bg-whatsapp-darkLighter rounded-2xl p-2 shadow-2xl border border-gray-100 dark:border-white/5 animate-in fade-in zoom-in duration-200"
                sideOffset={8}
                align="end"
              >
                <DropdownMenu.Item
                  onClick={() => setIsVerificationModalOpen(true)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all outline-none cursor-pointer group"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    user?.is_verified ? "bg-whatsapp-green/10 text-whatsapp-green" : "bg-whatsapp-teal/10 text-whatsapp-teal"
                  )}>
                    {user?.is_verified ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="uppercase tracking-wide text-[10px] text-gray-400">Status Ministerial</span>
                    {user?.is_verified ? "Perfil Verificado" : "Solicitar Verificação"}
                  </div>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-[1px] bg-gray-100 dark:bg-white/5 my-1" />
                
                <DropdownMenu.Item
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all outline-none cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                  Compartilhar Perfil
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Social Links Row */}
        {([
          { label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500', key: 'instagram_url', type: 'instagram' },
          { label: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-500', key: 'whatsapp_url', type: 'whatsapp' },
          { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-500', key: 'linkedin_url', type: 'linkedin' },
          { label: 'YouTube', icon: Youtube, color: 'hover:text-red-500', key: 'youtube_url', type: 'youtube' },
          { label: 'Site', icon: Globe, color: 'hover:text-blue-400', key: 'website_url', type: 'website' },
        ].filter(l => user?.[l.key]).length > 0) && (
            <div className="flex items-center gap-3 mb-8">
              {[
                { label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500', key: 'instagram_url', type: 'instagram' },
                { label: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-500', key: 'whatsapp_url', type: 'whatsapp' },
                { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-500', key: 'linkedin_url', type: 'linkedin' },
                { label: 'YouTube', icon: Youtube, color: 'hover:text-red-500', key: 'youtube_url', type: 'youtube' },
                { label: 'Site', icon: Globe, color: 'hover:text-blue-400', key: 'website_url', type: 'website' },
              ].filter(link => user?.[link.key]).map((link) => (
                <a
                  key={link.label}
                  href={formatExternalUrl(user?.[link.key], link.type)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90 group",
                    link.color
                  )}
                  title={link.label}
                >
                  <link.icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-inherit transition-colors" />
                </a>
              ))}
              <button className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
          )}

        {/* Highlights */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
          {/* Botão de Adicionar Story (Padrão Instagram) */}
          <div
            onClick={() => setIsStoryCreatorOpen(true)}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
          >
            <div className="w-[72px] h-[72px] rounded-[24px] border-2 border-dashed border-white/20 group-hover:border-whatsapp-green/50 transition-all flex items-center justify-center relative bg-white/5">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-whatsapp-green rounded-full border-2 border-[#0f0f0f] flex items-center justify-center shadow-lg">
                <Plus className="w-4 h-4 text-whatsapp-dark" />
              </div>
            </div>
            <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 tracking-widest uppercase">Adicionar</span>
          </div>

          {highlights.map((h: any) => (
            <div
              key={h.title}
              onClick={() => {
                setUserStories(h.stories); // Carrega TODO o grupo de stories
                setIsStoryViewerOpen(true);
              }}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
            >
              <div className="w-[72px] h-[72px] rounded-[24px] p-[2px] bg-gradient-to-tr from-whatsapp-green/40 to-emerald-400/40 group-hover:from-whatsapp-green group-hover:to-emerald-400 transition-all flex items-center justify-center relative shadow-xl">
                <div className="w-full h-full rounded-[22px] border-2 border-[#0f0f0f] overflow-hidden bg-gray-900 flex items-center justify-center">
                  {h.cover_url ? (
                    <img src={h.cover_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] p-2 text-center font-bold bg-whatsapp-green/20">
                      {h.title}
                    </div>
                  )}
                </div>
                {/* Botão de Editar Grupo */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingHighlight(h.stories[0]); // Edita a configuração do grupo
                    setIsHighlightModalOpen(true);
                  }}
                  className="absolute -top-1 -right-1 w-7 h-7 bg-[#1a1a1a] backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shadow-2xl z-10"
                >
                  <Settings2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
              <span className="text-[10px] font-black text-gray-700 dark:text-gray-200 tracking-widest uppercase truncate w-20 text-center">{h.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-t border-white/10 mt-4 h-12">
        {[
          { id: 'grid', icon: Grid },
          { id: 'lumes', icon: PlaySquare },
          { id: 'tagged', icon: UserSquare2 },
          { id: 'likes', icon: Flame },
          { id: 'saved', icon: Bookmark },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={cn(
              "flex-1 flex justify-center items-center transition-all",
              view === tab.id ? "text-gray-900 dark:text-white border-t-2 border-gray-900 dark:border-white -mt-[2px]" : "text-gray-400 dark:text-gray-500"
            )}
          >
            <tab.icon className={cn("w-6 h-6", view === tab.id && "fill-current")} />
          </button>
        ))}
      </div>

      {/* Dynamic Content Based on Tab */}
      <div className="min-h-[400px]">
        {view === 'grid' && (
          <div className="grid grid-cols-3 gap-[2px]">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-900 border border-black/5 dark:border-white/5"
                >
                  {post.media_url ? (
                    (post.post_type === 'audio' || post.media_url.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i)) ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-whatsapp-dark to-[#111b21]">
                        <div className="w-12 h-12 rounded-full bg-whatsapp-teal/20 flex items-center justify-center mb-2 animate-pulse">
                          <Mic className="w-6 h-6 text-whatsapp-teal" />
                        </div>
                        <div className="flex gap-[2px] h-3 items-end">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-1 bg-whatsapp-teal/40 rounded-full" style={{ height: `${20 + Math.random() * 80}%` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <img
                        src={post.media_url}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt=""
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-[10px] text-gray-500 text-center uppercase font-bold bg-white/5 leading-tight">
                      {post.content}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))
            ) : (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                  <Grid className="w-6 h-6 opacity-20" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Nenhuma publicação</p>
              </div>
            )}
          </div>
        )}

        {view === 'lumes' && (
          <div className="grid grid-cols-3 gap-[2px]">
            {userPosts.filter(p => p.post_type === 'video').length > 0 ? (
              userPosts.filter(p => p.post_type === 'video').map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-[9/16] relative group cursor-pointer overflow-hidden bg-gray-900"
                >
                  <video src={post.media_url} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlaySquare className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
                <PlaySquare className="w-8 h-8 opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Nenhum Lume disponível</p>
              </div>
            )}
          </div>
        )}

        {view === 'likes' && (
          <div className="grid grid-cols-3 gap-[2px]">
            {likedPosts.length > 0 ? (
              likedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-900 border border-white/5"
                >
                  {post.media_url ? (
                    (post.post_type === 'audio' || post.media_url.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i)) ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-whatsapp-dark to-[#111b21]">
                        <Mic className="w-5 h-5 text-whatsapp-teal/60 mb-1" />
                        <div className="flex gap-[1px] h-2 items-end">
                          {[1, 2, 3].map(i => <div key={i} className="w-[2px] h-[60%] bg-whatsapp-teal/20 rounded-full" />)}
                        </div>
                      </div>
                    ) : (
                      <img src={post.media_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-[10px] text-gray-500 text-center uppercase font-bold bg-white/5 leading-tight">{post.content}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest">Nada curtido ainda</p>
              </div>
            )}
          </div>
        )}

        {view === 'saved' && (
          <div className="grid grid-cols-3 gap-[2px]">
            {savedPosts.length > 0 ? (
              savedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-900 border border-white/5"
                >
                  {post.media_url ? (
                    (post.post_type === 'audio' || post.media_url.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i)) ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-whatsapp-dark to-[#111b21]">
                        <Mic className="w-5 h-5 text-whatsapp-teal/60 mb-1" />
                        <div className="flex gap-[1px] h-2 items-end">
                          {[1, 2, 3].map(i => <div key={i} className="w-[2px] h-[60%] bg-whatsapp-teal/20 rounded-full" />)}
                        </div>
                      </div>
                    ) : (
                      <img src={post.media_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-[10px] text-gray-500 text-center uppercase font-bold bg-white/5 leading-tight">{post.content}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                <Bookmark className="w-8 h-8" />
                <p className="text-[11px] font-black uppercase tracking-widest">Nada salvo ainda</p>
              </div>
            )}
          </div>
        )}

        {view === 'tagged' && (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
              <UserSquare2 className="w-6 h-6" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest">Nada por aqui ainda</p>
          </div>
        )}
      </div>

      <VerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        user={user}
        onRequested={() => {
          setIsVerificationModalOpen(false);
          toast.success("Solicitação enviada!");
        }}
      />

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onUpdate={(updated) => setUser(updated)}
      />

      {cropperFile && cropperConfig && (
        <ImageCropperModal
          image={cropperFile}
          isOpen={!!cropperFile}
          onClose={() => {
            if (cropperFile) URL.revokeObjectURL(cropperFile);
            setCropperFile(null);
            setCropperConfig(null);
          }}
          onCropComplete={onCropDone}
          aspect={cropperConfig.aspect}
          title={cropperConfig.title}
          isCircular={cropperConfig.isCircular}
        />
      )}

      <CreateHighlightModal
        isOpen={isHighlightModalOpen}
        onClose={() => {
          setIsHighlightModalOpen(false);
          setEditingHighlight(null);
        }}
        userId={user?.id}
        initialData={editingHighlight}
        onSuccess={() => {
          fetchHighlights();
          setIsHighlightModalOpen(false);
          setEditingHighlight(null);
        }}
      />
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all" onClick={() => setSelectedPost(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <PostCard
              post={selectedPost}
              currentUser={{ ...user, id: user?.id }}
              onDeleted={() => {
                setUserPosts(prev => prev.filter(p => p.id !== selectedPost.id));
                setSelectedPost(null);
              }}
            />
          </div>
        </div>
      )}

      {isStoryViewerOpen && user && (
        <StoryViewer
          storyGroups={[{
            id: user.id,
            author_id: user.id,
            author_name: user.full_name,
            author_avatar: user.avatar_url,
            stories: userStories
          }]}
          currentUser={user}
          onClose={() => setIsStoryViewerOpen(false)}
        />
      )}

      {isStoryCreatorOpen && user && (
        <StoryCreator
          open={isStoryCreatorOpen}
          user={user}
          onClose={() => setIsStoryCreatorOpen(false)}
          onCreated={() => {
            setIsStoryCreatorOpen(false);
            loadUserStories();
          }}
        />
      )}
      {isConnectionsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsConnectionsOpen(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-whatsapp-darkLighter rounded-[32px] overflow-hidden border border-gray-100 dark:border-white/5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs dark:text-gray-400">
                {connectionsType === 'followers' ? 'Seguidores' : 'Seguindo'}
              </h3>
              <button onClick={() => setIsConnectionsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto no-scrollbar p-2">
              {connectionsData.length > 0 ? (
                connectionsData.map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10">
                        <img src={person.avatar_url || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm dark:text-white line-clamp-1">{person.full_name || person.username}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-medium">@{person.username}</span>
                          {person.is_common && (
                            <span className="text-[9px] bg-whatsapp-green/10 text-whatsapp-green px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">Em comum</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link 
                      href={`/profile/${person.username}`} 
                      className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-whatsapp-green hover:text-whatsapp-dark rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      onClick={() => setIsConnectionsOpen(false)}
                    >
                      Ver
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3 opacity-40">
                  <UserSquare2 className="w-8 h-8" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum perfil aqui</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal - Premium Implementation */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-whatsapp-darkLighter rounded-[32px] overflow-hidden border border-gray-100 dark:border-white/5 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs dark:text-gray-400">Compartilhar Perfil</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center gap-8">
              {/* QR Code Container */}
              <div className="relative group">
                <div className="w-48 h-48 bg-white p-4 rounded-3xl shadow-xl transition-transform group-hover:scale-105 duration-500">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/profile/' + user?.username)}&bgcolor=FFFFFF&color=000000`} 
                    className="w-full h-full object-contain"
                    alt="Perfil QR Code"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-whatsapp-green text-whatsapp-dark text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Escanear
                </div>
              </div>

              {/* Link Box */}
              <div className="w-full space-y-4">
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-sm font-bold dark:text-white">@{user?.username}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Link do seu perfil</p>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-black/20 p-2 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div className="flex-1 truncate text-xs text-gray-500 dark:text-gray-400 font-medium px-2">
                    {window.location.origin}/profile/{user?.username}
                  </div>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/profile/${user?.username}`;
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      toast.success("Link copiado!");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
                      copied ? "bg-whatsapp-green text-whatsapp-dark" : "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20"
                    )}
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-black/10 flex justify-center">
               <p className="text-[10px] text-gray-400 font-medium italic">Seu perfil será aberto diretamente para quem escanear.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
