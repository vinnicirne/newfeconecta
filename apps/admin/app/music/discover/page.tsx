'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Share2, Play, Music, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function DiscoverPage() {
  const { play, toggleLike, likedTracks } = usePlayerStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});

  const fetchDiscover = useCallback(async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const { data, error: queryError } = await supabase
        .from('music_posts')
        .select('*, user:profiles(full_name, avatar_url, username), track:music_tracks(*)')
        .order('created_at', { ascending: false })
        .limit(50)
        .abortSignal(controller.signal);
      if (queryError) throw queryError;
      setItems(data || []);
    } catch (e) {
      console.error('Erro ao carregar o feed do FéMusic:', e);
      setError('Não foi possível carregar as publicações do FéMusic.');
      setItems([]);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchDiscover(); }, [fetchDiscover]);

  if (loading) {
    return (
      <div role="status" className="h-[calc(100dvh-130px)] w-full flex flex-col items-center justify-center gap-3 bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-whatsapp-teal" aria-hidden="true" />
        <span className="text-sm text-white/70">Carregando publicações…</span>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <main className="min-h-[calc(100dvh-130px)] w-full flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-whatsapp-teal">
          {error ? <RefreshCw className="h-7 w-7" /> : <Music className="h-7 w-7" />}
        </div>
        <h1 className="text-lg font-bold">{error ? 'Não carregou desta vez' : 'O feed de louvor está começando'}</h1>
        <p className="max-w-sm text-sm text-white/65">
          {error ? error : 'Compartilhe um louvor no FéMusic para inspirar a comunidade.'}
        </p>
        {error ? (
          <button type="button" onClick={() => void fetchDiscover()} className="rounded-full bg-whatsapp-teal px-5 py-2.5 text-sm font-semibold text-white">
            Tentar novamente
          </button>
        ) : (
          <Link href="/music" className="rounded-full bg-whatsapp-teal px-5 py-2.5 text-sm font-semibold text-white">Ir para o FéMusic</Link>
        )}
      </main>
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
        const platform = item.platform || track.provider || 'youtube';
        const isLiked = likedTracks.some(t => (t.providerTrackId || t.id) === trackId);

        return (
          <div key={item.id} className="h-full w-full snap-start relative flex items-center justify-center">
            {/* Background Video/Image */}
            <div className="absolute inset-0">
              {track.cover ? (
                <Image src={track.cover} fill unoptimized sizes="100vw" className="object-cover opacity-60" alt={`Capa de ${track.title}`} />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-900 via-black to-black" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90" />
            </div>

            {/* Content (Bottom Left) */}
            <div className="absolute bottom-6 left-4 right-20 z-10 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="relative w-8 h-8 rounded-full bg-whatsapp-teal/20 overflow-hidden border border-white/20 flex items-center justify-center">
                  {item.user?.avatar_url ? (
                    <Image src={item.user.avatar_url} width={32} height={32} unoptimized className="w-full h-full object-cover" alt="" />
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
                <div className="bg-black/50 backdrop-blur-md p-2 rounded-xl border border-white/10">
                  <p className={`text-xs text-gray-200 whitespace-pre-wrap break-words ${expandedCaptions[item.id] ? 'max-h-40 overflow-y-auto' : 'line-clamp-2'}`}>
                    {item.reflection}
                  </p>
                  {item.reflection.length > 100 && (
                    <button type="button" aria-expanded={Boolean(expandedCaptions[item.id])} onClick={() => setExpandedCaptions((current) => ({ ...current, [item.id]: !current[item.id] }))} className="mt-1 text-xs font-semibold text-white/80 hover:text-white">
                      {expandedCaptions[item.id] ? 'Mostrar menos' : 'Ler reflexão'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons (Bottom Right) */}
            <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
              <button 
                onClick={() => {
                  if (platform === 'youtube') play(track, items.filter((entry) => (entry.platform || entry.track?.provider || 'youtube') === 'youtube').map((entry) => entry.track || entry));
                  else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                  else toast.error('O link de reprodução não está disponível.');
                }}
                aria-label={platform === 'youtube' ? `Ouvir ${track.title} no FéMusic` : `Abrir ${track.title} em ${platform}`}
                className="w-12 h-12 rounded-full bg-whatsapp-teal text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                title={platform === 'youtube' ? 'Tocar agora' : `Abrir no ${platform}`}
              >
                {platform === 'youtube' ? <Play className="w-6 h-6 fill-current ml-0.5" /> : <ExternalLink className="w-5 h-5" />}
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
                    url: item.url || `${window.location.origin}/music/discover`
                  };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch {}
                  } else {
                    try {
                      await navigator.clipboard.writeText(shareData.url);
                      toast.success('Link copiado!');
                    } catch {
                      toast.error('Não foi possível copiar o link.');
                    }
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
