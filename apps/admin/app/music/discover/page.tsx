'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Play, Music, Loader2, Sparkles } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const FALLBACK_DISCOVER_TRACKS = [
  {
    id: 'disc-1',
    title: 'Lugar Secreto',
    artist: 'Gabriela Rocha',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    duration: 320,
    provider: 'youtube',
    providerTrackId: 'y3x9B92p10w',
    reflection: 'Tu és tudo o que eu mais quero, o meu fôlego de vida... 🙏✨',
    user: { full_name: 'FéConecta Música', username: 'feconecta', avatar_url: null }
  },
  {
    id: 'disc-2',
    title: 'A Casa É Sua',
    artist: 'Casa Worship',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    duration: 480,
    provider: 'youtube',
    providerTrackId: 'v4m3X89fL10',
    reflection: 'Essa casa é sua casa, nós deixamos ela pra você, Jesus! ❤️',
    user: { full_name: 'Comunidade da Fé', username: 'louvor', avatar_url: null }
  },
  {
    id: 'disc-3',
    title: 'Bondade de Deus',
    artist: 'Isadora Pompeo',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800',
    duration: 310,
    provider: 'youtube',
    providerTrackId: 'i8L3k11w9Mp',
    reflection: 'Toda a minha vida foste fiel, toda a minha vida foste tão bom!',
    user: { full_name: 'Adoração Cristã', username: 'adoradores', avatar_url: null }
  },
];

export default function DiscoverPage() {
  const { play, toggleLike, likedTracks } = usePlayerStore();
  const [items, setItems] = useState<any[]>(FALLBACK_DISCOVER_TRACKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscover() {
      try {
        const { data, error } = await supabase
          .from('music_posts')
          .select('*, user:profiles(full_name, avatar_url, username), track:music_tracks(*)')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (!error && data && data.length > 0) {
          setItems(data);
        }
      } catch (e) {
        console.warn("Usando catálogo de descoberta", e);
      } finally {
        setLoading(false);
      }
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

  return (
    <div className="h-[calc(100vh-130px)] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black text-white relative">
      {items.map((item) => {
        const track = item.track || {
          id: item.external_id || item.id,
          provider: item.platform || 'youtube',
          providerTrackId: item.external_id || item.id || item.providerTrackId,
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
                className="w-12 h-12 rounded-full bg-whatsapp-teal text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
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
