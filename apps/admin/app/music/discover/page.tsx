'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Play, Music, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function DiscoverPage() {
  const { play, toggleLike, likedTracks } = usePlayerStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscover() {
      const { data, error } = await supabase
        .from('music_posts')
        .select('*, user:profiles(full_name, avatar_url, username), track:music_tracks(*)')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    }
    fetchDiscover();
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-130px)] w-full flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-whatsapp-teal" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-[calc(100vh-130px)] w-full flex flex-col items-center justify-center bg-black text-white px-4 text-center">
        <Music className="w-12 h-12 text-whatsapp-teal mb-4 opacity-80" />
        <h3 className="font-bold text-lg mb-1">Nenhum louvor compartilhado ainda</h3>
        <p className="text-xs text-gray-400 max-w-xs">
          Compartilhe suas músicas e reflexões favoritas para que a comunidade possa ouvir aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-130px)] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black text-white relative">
      {items.map((item) => {
        const track = item.track || {
          id: item.external_id || item.id,
          provider: item.platform || 'youtube',
          providerTrackId: item.external_id || item.id,
          title: item.title || 'Louvor',
          artist: item.artist || 'FéConecta',
          cover: item.cover,
          duration: item.duration || 210,
        };
        const trackId = track.providerTrackId || track.id;
        const isLiked = likedTracks.some(t => (t.providerTrackId || t.id) === trackId);

        return (
          <div key={item.id} className="h-full w-full snap-start relative flex items-center justify-center">
            {/* Background Video/Image */}
            <div className="absolute inset-0">
              {track.cover ? (
                <img src={track.cover} className="w-full h-full object-cover opacity-60" alt={track.title} />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-900 via-black to-black" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90" />
            </div>

            {/* Content (Bottom Left) */}
            <div className="absolute bottom-6 left-4 right-20 z-10 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-whatsapp-teal/20 overflow-hidden border border-white/20 flex items-center justify-center">
                  {item.user?.avatar_url ? (
                    <img src={item.user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-xs font-bold text-white uppercase">
                      {(item.user?.full_name || item.user?.username || 'U')[0]}
                    </span>
                  )}
                </div>
                <span className="font-bold text-sm text-white drop-shadow">
                  {item.user?.full_name || item.user?.username || 'Membro'}
                </span>
              </div>
              
              <h2 className="text-2xl font-black leading-tight drop-shadow mb-0.5">{track.title}</h2>
              <p className="text-sm text-gray-200 font-medium drop-shadow mb-1">{track.artist}</p>
              
              {item.reflection && (
                <p className="text-xs text-gray-300 line-clamp-2 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10">
                  &ldquo;{item.reflection}&rdquo;
                </p>
              )}
            </div>

            {/* Action Buttons (Bottom Right) */}
            <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
              <button 
                onClick={() => play(track, items.map(i => i.track || i))}
                className="w-12 h-12 rounded-full bg-whatsapp-teal text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                title="Tocar Agora"
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>

              <button 
                onClick={() => toggleLike(track)} 
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                </div>
              </button>

              <button 
                onClick={async () => {
                  const shareData = {
                    title: track.title,
                    text: `Ouça "${track.title}" no FéMusic!`,
                    url: `${window.location.origin}/music?track=${trackId}`
                  };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch {}
                  } else {
                    navigator.clipboard.writeText(shareData.url);
                    toast.success('Link copiado!');
                  }
                }} 
                className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                title="Compartilhar"
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

