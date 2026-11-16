"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProfileModals } from "@/hooks/profile/useProfileModals";
import { useProfileConnections } from "@/hooks/profile/useProfileConnections";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileHighlights } from "@/components/profile/ProfileHighlights";
import { ProfileMediaGrid } from "@/components/profile/ProfileMediaGrid";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ImageCropperModal } from "@/components/profile/ImageCropperModal";
import { CreateHighlightModal } from "@/components/profile/CreateHighlightModal";
import { VerificationModal } from "@/components/profile/VerificationModal";
import { ProfileConnectionsModal } from "@/components/profile/ProfileConnectionsModal";
import StoryViewer from "@/components/feed/StoryViewer";
import StoryCreator from "@/components/feed/StoryCreator";

import {
  Grid, Bookmark, PlaySquare, Heart, Settings, X, Copy, CheckCircle2, Repeat2, ArrowLeft, Flame, Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import PostCard from "@/components/feed/PostCard";
import { toast } from "sonner";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export default function ProfilePage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'tagged' | 'lumes' | 'audio' | 'likes' | 'saved' | 'settings'>('grid');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  useBodyScrollLock(!!selectedPost);
  const postCloseButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);

  const modals = useProfileModals();
  const connections = useProfileConnections();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setAuthUser(user);
        else router.push('/login');
      } catch (error) {
        console.error("Falha ao verificar autenticação do perfil:", error);
        router.push('/login');
      } finally {
        setIsAuthLoading(false);
      }
    };
    initAuth();
  }, [router]);

  const { 
    profile: user, 
    posts: userPosts, 
    liked: likedPosts, 
    saved: savedPosts, 
    stories: userStories, 
    highlights: rawHighlights,
    isLoading: loading,
    error: profileError,
    mutate
  } = useUserProfile(authUser?.id || null);

  const setUser = (updated: any) => {
    mutate(updated, { revalidate: false });
  };

  const setUserStories = (stories: any) => {
    mutate((prev: any) => ({ ...prev, stories }), false);
  };

  const updateProfilePost = (updatedPost: any) => {
    setUser((prev: any) => ({
      ...prev,
      posts: prev.posts?.map((post: any) => post.id === updatedPost.id ? { ...post, ...updatedPost } : post),
      liked: prev.liked?.map((post: any) => post.id === updatedPost.id ? { ...post, ...updatedPost } : post),
      saved: prev.saved?.map((post: any) => post.id === updatedPost.id ? { ...post, ...updatedPost } : post)
    }));
    setSelectedPost((prev: any) => prev?.id === updatedPost.id ? { ...prev, ...updatedPost } : prev);
  };

  const removeProfilePost = (postId: string) => {
    setUser((prev: any) => ({
      ...prev,
      posts: prev.posts?.filter((post: any) => post.id !== postId),
      liked: prev.liked?.filter((post: any) => post.id !== postId),
      saved: prev.saved?.filter((post: any) => post.id !== postId),
      posts_count: Math.max(0, (prev.posts_count || 0) - 1)
    }));
    setSelectedPost(null);
  };

  const highlights = React.useMemo(() => {
    const groups: Record<string, any> = {};
    rawHighlights.forEach((story: any) => {
      const title = story.highlight_title || 'Destaque';
      if (!groups[title]) {
        groups[title] = { id: story.id, title, cover_url: story.highlight_cover_url || story.media_url, stories: [] };
      }
      groups[title].stories.push(story);
    });
    return Object.values(groups);
  }, [rawHighlights]);

  useEffect(() => {
    if (!user?.id) return;

    const followChannel = supabase
      .channel(`profile-self-sync-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follows',
        filter: `following_id=eq.${user.id}`
      }, (payload) => {
        setUser((prev: any) => {
          const increment = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
          return { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) + increment) };
        });
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follows',
        filter: `follower_id=eq.${user.id}`
      }, (payload) => {
        setUser((prev: any) => {
          const increment = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
          return { ...prev, following_count: Math.max(0, (prev.following_count || 0) + increment) };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(followChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedPost) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    postCloseButtonRef.current?.focus();

    return () => previouslyFocusedRef.current?.focus();
  }, [selectedPost]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    modals.openCropper(imageUrl, {
      type,
      aspect: type === 'avatar' ? 1 : 16 / 6,
      title: type === 'avatar' ? 'Recortar Foto de Perfil' : 'Ajustar Banner',
      isCircular: type === 'avatar'
    });
  };

  const onCropDone = async (blob: Blob) => {
    if (!modals.cropperConfig || !user?.id) return;

    const type = modals.cropperConfig.type;
    const fileName = `${type}_${user.id}.jpg`;

    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);
        
      const publicUrlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      const field = type === 'avatar' ? 'avatar_url' : 'banner_url';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [field]: publicUrlWithCacheBuster })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser((prev: any) => ({ ...prev, [field]: publicUrlWithCacheBuster }));
      modals.closeCropper();

    } catch (err: any) {
      alert(`Erro no upload (${type}): ` + err.message);
    }
  };

  if (isAuthLoading || (loading && !user)) {
    return (
      <div className="flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 border-x mx-auto text-gray-500" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-whatsapp-teal border-t-transparent" />
        <span className="text-sm">Carregando seu perfil…</span>
      </div>
    );
  }

  if (profileError && !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-gray-700 dark:text-gray-200">
        <h1 className="text-lg font-bold">Não foi possível carregar seu perfil</h1>
        <p className="max-w-sm text-sm text-gray-500">Verifique sua conexão e tente novamente.</p>
        <button type="button" onClick={() => void mutate()} className="rounded-xl bg-whatsapp-teal px-5 py-3 text-sm font-semibold text-white hover:bg-whatsapp-tealLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal focus-visible:ring-offset-2">
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen pb-32 max-w-2xl mx-auto border-x bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
      
      <ProfileHeader 
        user={user}
        userStoriesLength={userStories.length}
        isSelf={true}
        onLogout={handleLogout}
        onSetView={setView as any}
        onFetchConnections={connections.fetchConnections}
        onOpenCropper={handleFileSelect}
        onOpenStoryViewer={() => modals.setIsStoryViewerOpen(true)}
        onOpenStoryCreator={() => modals.setIsStoryCreatorOpen(true)}
        onOpenHighlightModal={() => modals.setIsHighlightModalOpen(true)}
        onOpenEditModal={modals.openEditModal}
        onOpenVerificationModal={() => modals.setIsVerificationModalOpen(true)}
        onOpenShareModal={() => modals.setIsShareModalOpen(true)}
      />

      {profileError && user && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200" role="status">
          <span>Mostrando os dados salvos. Não foi possível atualizar o perfil.</span>
          <button type="button" onClick={() => void mutate()} className="shrink-0 font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">Tentar novamente</button>
        </div>
      )}

      <div className="px-5">
        <ProfileHighlights
          highlights={highlights}
          userStories={userStories}
          setIsStoryCreatorOpen={modals.setIsStoryCreatorOpen}
          setIsStoryViewerOpen={modals.setIsStoryViewerOpen}
          setUserStories={setUserStories}
          setEditingHighlight={modals.setEditingHighlight}
          setIsHighlightModalOpen={modals.setIsHighlightModalOpen}
        />
      </div>

      <div className="flex border-b border-black/5 dark:border-white/5 mt-4 sticky top-14 bg-white/80 dark:bg-black/80 backdrop-blur-md z-40">
        {[
          { id: 'grid', icon: Grid, label: 'Publicações' },
          { id: 'lumes', icon: PlaySquare, label: 'Vídeos' },
          { id: 'audio', icon: Mic, label: 'Áudios' },
          { id: 'likes', icon: Heart, label: 'Curtidas' },
          { id: 'saved', icon: Bookmark, label: 'Salvos' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id as any)}
            aria-label={tab.label}
            aria-pressed={view === tab.id}
            title={tab.label}
            className={cn(
              "flex-1 py-3 flex justify-center border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-whatsapp-teal",
              view === tab.id ? "border-whatsapp-teal text-whatsapp-teal dark:text-whatsapp-green dark:border-whatsapp-green" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            <tab.icon className={cn("w-6 h-6", view === tab.id && "fill-current")} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {view === 'settings' ? (
          <div className="p-4 space-y-2">
            <h3 className="font-bold mb-4">Configurações</h3>
            <button onClick={() => router.push('/saved')} className="w-full text-left p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium">Itens Salvos</button>
            <button onClick={() => router.push('/privacy')} className="w-full text-left p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium">Privacidade e Segurança</button>
            <button onClick={() => router.push('/terms')} className="w-full text-left p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium">Termos de Uso</button>
            <button onClick={() => router.push('/delete-account')} className="w-full text-left p-3 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors font-medium">Excluir Conta</button>
          </div>
        ) : (
          <ProfileMediaGrid
            userPosts={userPosts}
            likedPosts={likedPosts}
            savedPosts={savedPosts}
            isLoading={loading}
            view={view}
            setSelectedPost={setSelectedPost}
          />
        )}
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90" onClick={() => setSelectedPost(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-post-dialog-title"
            className="flex min-h-0 flex-1 flex-col"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSelectedPost(null);
            }}
          >
            <div className="flex items-center justify-between p-4">
              <button
                ref={postCloseButtonRef}
                type="button"
                onClick={() => setSelectedPost(null)}
                aria-label="Fechar publicação"
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ArrowLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <h2 id="profile-post-dialog-title" className="font-bold text-white">Publicação</h2>
              <div className="w-10" aria-hidden="true" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-20">
              <div className="mx-auto w-full max-w-lg">
                <PostCard
                  post={{
                    ...selectedPost,
                    author_name: user?.full_name || 'Usuário FéConecta',
                    author_username: user?.username || user?.id,
                    author_avatar: user?.avatar_url,
                    is_verified: user?.is_verified,
                    verification_label: user?.verification_label,
                    disableMediaNavigation: true
                  }}
                  currentUser={user}
                  onUpdated={updateProfilePost}
                  onDeleted={removeProfilePost}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* MODALS ORCHESTRATION */}
      {connections.isConnectionsOpen && (
        <ProfileConnectionsModal
          isOpen={connections.isConnectionsOpen}
          onClose={() => connections.setIsConnectionsOpen(false)}
          type={connections.connectionsType}
          data={connections.connectionsData}
        />
      )}

      {modals.isVerificationModalOpen && (
        <VerificationModal
          isOpen={modals.isVerificationModalOpen}
          onClose={() => modals.setIsVerificationModalOpen(false)}
          onRequested={() => {
            modals.setIsVerificationModalOpen(false);
          }}
          user={user}
        />
      )}

      {modals.isEditModalOpen && (
        <EditProfileModal
          isOpen={modals.isEditModalOpen}
          onClose={modals.closeEditModal}
          user={user}
          onUpdate={(updates: any) => setUser((prev: any) => ({ ...prev, ...updates }))}
        />
      )}

      {modals.isHighlightModalOpen && (
        <CreateHighlightModal
          isOpen={modals.isHighlightModalOpen}
          onClose={() => {
            modals.setIsHighlightModalOpen(false);
            modals.setEditingHighlight(null);
          }}
          userId={user?.id}
          initialData={modals.editingHighlight}
          onSuccess={() => {
            modals.setIsHighlightModalOpen(false);
            modals.setEditingHighlight(null);
          }}
        />
      )}

      {modals.isStoryViewerOpen && user && (
        <StoryViewer
          storyGroups={[{ author_id: user.id, author_name: user.username, author_avatar: user.avatar_url, stories: userStories, allViewed: false }]}
          startUserIndex={0}
          currentUser={user}
          onClose={() => modals.setIsStoryViewerOpen(false)}
        />
      )}

      {modals.isStoryCreatorOpen && user && (
        <StoryCreator
          open={modals.isStoryCreatorOpen}
          onClose={() => modals.setIsStoryCreatorOpen(false)}
          user={user}
          onCreated={() => modals.setIsStoryCreatorOpen(false)}
        />
      )}

      {modals.isShareModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => modals.setIsShareModalOpen(false)}>
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Compartilhar Perfil</h3>
              <button onClick={() => modals.setIsShareModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/profile/${user?.username}` : `https://feconecta.com.br/profile/${user?.username}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all"
              >
                {copied ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-gray-500" />}
                <span className="font-bold">{copied ? 'Link Copiado!' : 'Copiar Link do Perfil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modals.cropperFile && modals.cropperConfig && (
        <ImageCropperModal
          isOpen={true}
          onClose={modals.closeCropper}
          image={modals.cropperFile}
          onCropComplete={onCropDone}
          aspect={modals.cropperConfig.aspect}
          title={modals.cropperConfig.title}
          isCircular={modals.cropperConfig.isCircular}
        />
      )}
    </div>
  );
}
