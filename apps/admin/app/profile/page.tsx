"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid, ChevronDown, Plus, Camera, Globe, Instagram, MessageCircle, Linkedin, Youtube, Settings2, UserSquare2, PlaySquare, Heart, Bookmark, ArrowLeft, Menu, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ImageCropperModal } from "@/components/profile/ImageCropperModal";
import { CreateHighlightModal } from "@/components/profile/CreateHighlightModal";

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
  
  // Cropper States
  const [cropperFile, setCropperFile] = useState<string | null>(null);
  const [cropperConfig, setCropperConfig] = useState<{
    aspect: number;
    title: string;
    isCircular: boolean;
    type: 'avatar' | 'banner';
  } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    // Para teste, pegamos o usuário mock ou o real logado
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || '296f0f37-c8b8-4ad1-855c-4625f3f14731';

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setUser(profile);
    } else {
      // Se não existir o registro do admin, criamos ele agora para parar de resetar
      const defaultData = {
        id: userId,
        full_name: "Jonathan Scott",
        username: "john_scott",
        avatar_url: "https://i.pravatar.cc/150?u=jonathan",
        bio: "Creative/Artistic\nApaixonado por conectar pessoas através da fé.",
        followers_count: 1251,
        following_count: 763,
        posts_count: 5,
        website_url: "www.johnscott.com",
        church: "Igreja FéConecta"
      };

      if (userId === '296f0f37-c8b8-4ad1-855c-4625f3f14731') {
         await supabase.from('profiles').insert(defaultData);
      }
      setUser(defaultData);
    }
    setLoading(false);
    fetchHighlights(userId);
    fetchUserPosts(userId);
    fetchLikedPosts(userId);
    fetchSavedPosts(userId);
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

  const fetchHighlights = async (userId: string) => {
    const { data } = await supabase
      .from('highlights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setHighlights(data);
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
    <div className="min-h-screen bg-black text-white pb-20 max-w-2xl mx-auto border-x border-white/5">
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
          <button className="p-1 hover:bg-white/10 rounded-lg transition-all"><Plus className="w-6 h-6" /></button>
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
            <div className="w-[100px] h-[100px] rounded-[32px] p-[3px] bg-black">
               <div className="w-full h-full rounded-[28px] border-4 border-black overflow-hidden bg-gray-800 shadow-2xl">
                  <img src={user?.avatar_url || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
               </div>
            </div>
            <label className="absolute bottom-2 right-0 w-7 h-7 bg-whatsapp-green rounded-xl border-4 border-black flex items-center justify-center scale-95 hover:scale-105 transition-transform cursor-pointer">
              <Plus className="w-5 h-5 text-whatsapp-dark font-black" />
              <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'avatar')} accept="image/*" />
            </label>
          </div>

          <div className="flex-1 flex justify-around text-center pt-8">
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">{user?.posts_count || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Publicações</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">{user?.followers_count?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Seguidores</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">{user?.following_count?.toLocaleString() || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Seguindo</span>
            </div>
          </div>
        </div>

        {/* Info & Bio */}
        <div className="space-y-0.5 mb-6">
          <h2 className="font-bold text-sm tracking-tight">{user?.full_name}</h2>
          <div className="text-sm whitespace-pre-wrap text-gray-100/90 leading-relaxed font-medium">
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
            className="flex-1 bg-white/10 hover:bg-white/15 py-2 rounded-xl text-sm font-bold transition-all border border-white/5 active:scale-95 uppercase tracking-wide"
          >
            Editar Perfil
          </button>
          <button className="w-10 bg-white/10 hover:bg-white/15 flex items-center justify-center rounded-xl transition-all border border-white/5 active:scale-95">
            <ChevronDown className="w-4 h-4" />
          </button>
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
                <link.icon className="w-5 h-5 text-gray-400 group-hover:text-inherit transition-colors" />
              </a>
            ))}
            <button className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all active:scale-90">
               <Settings2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Highlights */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
          <div 
            onClick={() => setIsHighlightModalOpen(true)}
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
          >
            <div className="w-[64px] h-[64px] rounded-full p-[1.5px] bg-white/10 group-hover:bg-white/20 transition-all flex items-center justify-center">
               <div className="w-full h-full rounded-full border border-black overflow-hidden bg-gray-900 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-gray-400" />
               </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 tracking-tight">Novo</span>
          </div>

          {highlights.map((h: any) => (
            <div key={h.id} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group">
              <div className="w-[64px] h-[64px] rounded-full p-[1.5px] bg-white/10 group-hover:bg-white/20 transition-all flex items-center justify-center">
                 <div className="w-full h-full rounded-full border border-black overflow-hidden bg-gray-900 flex items-center justify-center">
                    <img src={h.cover_url} className="w-full h-full object-cover" alt={h.label} />
                 </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 tracking-tight truncate w-16 text-center">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-t border-white/10 mt-4 h-12">
        {[
          { id: 'grid', icon: Grid },
          { id: 'lumes', icon: PlaySquare },
          { id: 'tagged', icon: UserSquare2 },
          { id: 'likes', icon: Heart },
          { id: 'saved', icon: Bookmark },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={cn(
              "flex-1 flex justify-center items-center transition-all",
              view === tab.id ? "text-white border-t-2 border-white -mt-[2px]" : "text-gray-500"
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
                <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-900 border border-white/5">
                   {post.media_url ? (
                     <img 
                       src={post.media_url} 
                       className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                       alt="" 
                     />
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
                <div key={post.id} className="aspect-[9/16] relative group cursor-pointer overflow-hidden bg-gray-900">
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
                <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-900 border border-white/5">
                   {post.media_url ? (
                     <img src={post.media_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
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
                <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-900 border border-white/5">
                   {post.media_url ? (
                     <img src={post.media_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
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
        onClose={() => setIsHighlightModalOpen(false)}
        userId={user?.id || '296f0f37-c8b8-4ad1-855c-4625f3f14731'}
        onSuccess={(newHighlight) => {
          setHighlights(prev => [newHighlight, ...prev]);
        }}
      />
    </div>
  );
}
