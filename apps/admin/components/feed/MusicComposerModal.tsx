"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Music, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function getMusicLinkDetails(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('Cole um link válido de YouTube, Spotify ou Deezer.');
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const externalId = host === 'youtu.be'
      ? parts[0]
      : url.searchParams.get('v') || (['shorts', 'live', 'embed'].includes(parts[0]) ? parts[1] : null);
    const playlistId = url.searchParams.get('list');
    if (!externalId && playlistId) {
      return { platform: 'youtube', type: 'playlist', externalId: playlistId, title: 'Playlist compartilhada', cover: null };
    }
    if (!externalId || !/^[\w-]{6,}$/.test(externalId)) {
      throw new Error('Esse link do YouTube não parece apontar para uma música ou vídeo válido.');
    }
    return {
      platform: 'youtube',
      type: 'track',
      externalId,
      title: 'Louvor compartilhado',
      cover: `https://i.ytimg.com/vi/${externalId}/hqdefault.jpg`,
    };
  }

  if (host === 'open.spotify.com' || host === 'spotify.link') {
    const parts = url.pathname.split('/').filter(Boolean);
    const type = parts.find((part) => ['track', 'playlist', 'album', 'episode', 'show'].includes(part));
    const externalId = type ? parts[parts.indexOf(type) + 1] : null;
    if (!externalId) throw new Error('Cole o link direto de uma música, álbum ou playlist do Spotify.');
    if (!/^[\w-]{6,}$/.test(externalId)) throw new Error('O link do Spotify não contém um identificador válido.');
    const spotifyType = type || 'track';
    return {
      platform: 'spotify',
      type: spotifyType === 'playlist' ? 'playlist' : spotifyType === 'album' ? 'album' : ['episode', 'show'].includes(spotifyType) ? 'podcast' : 'track',
      externalId,
      title: 'Louvor compartilhado',
      cover: null,
    };
  }

  if (host === 'deezer.com' || host.endsWith('.deezer.com')) {
    const parts = url.pathname.split('/').filter(Boolean);
    const type = parts.find((part) => ['track', 'album', 'playlist', 'show', 'episode'].includes(part));
    const externalId = type ? parts[parts.indexOf(type) + 1] : null;
    if (!externalId) throw new Error('Cole o link direto de uma música, álbum ou playlist do Deezer.');
    if (!/^\d+$/.test(externalId)) throw new Error('O link do Deezer não contém um identificador válido.');
    const deezerType = type || 'track';
    return {
      platform: 'deezer',
      type: deezerType === 'playlist' ? 'playlist' : deezerType === 'album' ? 'album' : ['show', 'episode'].includes(deezerType) ? 'podcast' : 'track',
      externalId,
      title: 'Louvor compartilhado',
      cover: null,
    };
  }

  throw new Error('Use um link de YouTube, Spotify ou Deezer.');
}

export default function MusicComposerModal({ isOpen, onClose, onSuccess, initialUrl = '' }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setReflection('');
      setError('');
    }
  }, [isOpen, initialUrl]);

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Entre na sua conta para compartilhar um louvor.');
      const link = getMusicLinkDetails(url);

      const { data: musicPost, error: musicPostError } = await supabase.from('music_posts').insert([{
        user_id: user.id,
        platform: link.platform,
        type: link.type,
        external_id: link.externalId,
        title: link.title,
        artist: null,
        cover: link.cover,
        url: url.trim(),
        reflection: reflection.trim() || null,
        visibility: 'public',
      }]).select('id').single();

      if (musicPostError) throw new Error(`Não foi possível publicar no FéMusic: ${musicPostError.message}`);

      const feedContent = reflection.trim()
        ? `${reflection.trim()}\n\n🎵 Louvor no FéMusic:\n${url.trim()}`
        : `🎵 Compartilhando um louvor que me abençoou:\n${url.trim()}`;
      const { data: newPost, error: insertError } = await supabase.from('posts').insert([{
        author_id: user.id,
        user_id: user.id,
        content: feedContent,
        media_url: url.trim(),
        post_type: 'text',
        metadata: { source: 'femusic', music_post_id: musicPost.id, platform: link.platform, media_type: link.type },
      }]).select().single();

      if (insertError) {
        await supabase.from('music_posts').delete().eq('id', musicPost.id);
        throw new Error(`O louvor foi preparado, mas não entrou no feed da rede: ${insertError.message}`);
      }

      if (typeof window !== 'undefined' && newPost) {
        window.dispatchEvent(new CustomEvent('feconecta:new-post', { detail: newPost }));
        try {
          const bc = new BroadcastChannel('feconecta_feed_sync');
          bc.postMessage({ type: 'NEW_POST', post: newPost });
          bc.close();
        } catch (e) {}
      }

      setUrl('');
      setReflection('');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao compartilhar música');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-[#1a1b1e] w-full max-w-md max-h-[90dvh] rounded-[32px] overflow-y-auto flex flex-col shadow-2xl relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-white/5">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Music className="w-5 h-5 text-whatsapp-teal" />
                Compartilhar
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-xl">{error}</div>}
              
              <div>
                <label htmlFor="femusic-track-url" className="text-xs font-bold text-gray-500 uppercase mb-2 block">Link do louvor</label>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 flex items-center pointer-events-none text-gray-400">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <input
                    id="femusic-track-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Cole um link de YouTube, Spotify ou Deezer"
                    autoComplete="url"
                    aria-invalid={Boolean(error)}
                    className="w-full bg-gray-100 dark:bg-black/50 border border-transparent focus:border-whatsapp-teal/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="femusic-reflection" className="text-xs font-bold text-gray-500 uppercase mb-2 block">Legenda ou reflexão · opcional</label>
                <textarea
                  id="femusic-reflection"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="O que Deus falou com você através dessa música?"
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-gray-100 dark:bg-black/50 border border-transparent focus:border-whatsapp-teal/50 rounded-2xl p-4 outline-none transition-all resize-none font-medium text-sm text-gray-800 dark:text-gray-200"
                />
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mt-1">
                  <span>A reflexão aparece junto com o louvor.</span>
                  {reflection.length}/1000
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!url.trim() || loading}
                aria-busy={loading}
                className="w-full bg-whatsapp-teal text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center mt-2"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Publicando...</> : 'Compartilhar louvor'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
