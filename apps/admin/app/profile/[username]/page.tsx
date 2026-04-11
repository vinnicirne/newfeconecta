"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Grid, ChevronDown, Globe, Instagram, MessageCircle, 
  Linkedin, Youtube, UserSquare2, PlaySquare, Heart, 
  ArrowLeft, RefreshCw 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'lumes' | 'likes'>('grid');
  const [userPosts, setUserPosts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [username]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Buscamos o perfil pelo username
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !profile) {
        toast.error("Perfil não encontrado");
        router.push('/');
        return;
      }

      setUser(profile);

      // 2. Buscamos o usuário logado
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setCurrentUser(authUser);
        
        // 3. Verificamos se já segue
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', authUser.id)
          .eq('following_id', profile.id)
          .maybeSingle();
        
        setIsFollowing(!!follow);
      }

      // 4. Buscamos as postagens
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false });
      
      setUserPosts(posts || []);

    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!currentUser || !user) return;
    
    const oldFollowing = isFollowing;
    setIsFollowing(!oldFollowing);

    try {
      if (oldFollowing) {
        const { error } = await supabase.from('follows').delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: user.id
        });
        if (error) throw error;
      }
    } catch (err) {
      setIsFollowing(oldFollowing);
      toast.error("Erro ao processar seguimento");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <RefreshCw className="w-8 h-8 animate-spin text-whatsapp-teal" />
      <p className="text-xs font-bold uppercase tracking-widest opacity-40">Carregando Perfil...</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 max-w-2xl mx-auto border-x">
      {/* Banner */}
      <div className="relative h-48 w-full bg-gray-900 overflow-hidden">
        {user?.banner_url ? (
          <img src={user.banner_url} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal/20 via-black to-whatsapp-green/20" />
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-lg transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold tracking-tight">@{user?.username}</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Profile Header Stats */}
      <div className="px-5 -mt-12 relative z-10 pb-2">
        <div className="flex items-center justify-between gap-4 mb-6 pt-12">
          <div className="w-[100px] h-[100px] rounded-[32px] p-[3px] bg-black">
             <div className="w-full h-full rounded-[28px] border-4 border-black overflow-hidden bg-gray-800 shadow-2xl">
                <img src={user?.avatar_url || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
             </div>
          </div>

          <div className="flex-1 flex justify-around text-center pt-8">
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">{user?.posts_count || userPosts.length}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Posts</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">{user?.followers_count || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Seguidores</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">{user?.following_count || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Seguindo</span>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 mb-6">
          <h2 className="font-bold text-sm tracking-tight">{user?.full_name}</h2>
          <p className="text-sm text-gray-100/90 leading-relaxed">{user?.bio}</p>
          {user?.church && <p className="text-xs text-whatsapp-green font-bold uppercase tracking-wider mt-1">{user.church}</p>}
        </div>

        <div className="flex gap-2 mb-6">
          {currentUser?.id === user.id ? (
            <button onClick={() => router.push('/profile')} className="flex-1 bg-white/10 py-2 rounded-xl text-sm font-bold uppercase tracking-wide">Meu Perfil</button>
          ) : (
            <button 
              onClick={toggleFollow}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 uppercase tracking-wide",
                isFollowing 
                  ? "bg-white/5 border border-white/10 text-gray-400" 
                  : "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20"
              )}
            >
              {isFollowing ? "Seguindo" : "Seguir"}
            </button>
          )}
          <button className="w-10 bg-white/10 flex items-center justify-center rounded-xl border border-white/5">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex border-t border-white/10 mt-4 h-12">
        <button onClick={() => setView('grid')} className={cn("flex-1 flex justify-center items-center", view === 'grid' ? "text-white border-t-2 border-white -mt-[2px]" : "text-gray-500")}>
          <Grid className="w-6 h-6" />
        </button>
        <button onClick={() => setView('lumes')} className={cn("flex-1 flex justify-center items-center", view === 'lumes' ? "text-white border-t-2 border-white -mt-[2px]" : "text-gray-500")}>
          <PlaySquare className="w-6 h-6" />
        </button>
        <button onClick={() => setView('likes')} className={cn("flex-1 flex justify-center items-center", view === 'likes' ? "text-white border-t-2 border-white -mt-[2px]" : "text-gray-500")}>
          <Heart className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-[2px]">
        {userPosts.map((post) => (
          <div key={post.id} className="aspect-square relative bg-gray-900">
            {post.media_url ? (
              <img src={post.media_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-2 text-[8px] text-gray-500 text-center uppercase font-bold overflow-hidden">{post.content}</div>
            )}
          </div>
        ))}
        {userPosts.length === 0 && (
          <div className="col-span-3 py-20 text-center opacity-20">
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma publicação</p>
          </div>
        )}
      </div>
    </div>
  );
}
