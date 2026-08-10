'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Plus, Music, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { supabase } from '@/lib/supabase';

export default function DiscoverPage() {
  const { play } = usePlayerStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiscover() {
      const { data, error } = await supabase
        .from('music_posts')
        .select('*, user:profiles(full_name, avatar_url), track:music_tracks(*)')
        .limit(50);
        
      if (!error && data) {
        // Shuffle in memory for MVP "Random" effect
        const shuffled = data.sort(() => 0.5 - Math.random());
        setItems(shuffled);
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

  return (
    <div className="h-[calc(100vh-130px)] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black text-white relative">
      {items.map((item, index) => (
        <div key={item.id} className="h-full w-full snap-start relative flex items-center justify-center">
          {/* Background Video/Image */}
          <div className="absolute inset-0">
            <img src={item.track?.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17'} className="w-full h-full object-cover opacity-60" alt={item.track?.title} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90" />
          </div>

          {/* Content (Bottom Left) */}
          <div className="absolute bottom-6 left-4 right-16 z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden border-2 border-white">
                <img src={item.user?.avatar_url || `https://picsum.photos/seed/${item.id}/100/100`} />
              </div>
              <span className="font-bold text-sm shadow-sm">{item.user?.full_name || 'Usuário'}</span>
            </div>
            
            <h2 className="text-3xl font-black leading-none mb-1">{item.track?.title}</h2>
            <p className="text-lg text-gray-200 font-medium mb-2">{item.track?.artist}</p>
            
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <Music className="w-3 h-3" /> Compartilhado
              </span>
            </div>
          </div>

          {/* Action Buttons (Bottom Right) */}
          <div className="absolute bottom-6 right-2 z-10 flex flex-col items-center gap-6">
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold">12k</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold">348</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold">1k</span>
            </button>
            <button className="flex flex-col items-center gap-1 group mt-2">
              <div className="w-10 h-10 rounded-full bg-whatsapp-teal flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-black" />
              </div>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
