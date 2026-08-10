"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Music, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MusicComposerModal({ isOpen, onClose, onSuccess, initialUrl = '' }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen && initialUrl) {
      setUrl(initialUrl);
    }
  }, [isOpen, initialUrl]);

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Em um cenário real, chamaríamos uma Server Action que extrairia os metadados usando a classe SpotifyProvider
      // Aqui para o MVP, vamos extrair o mínimo possível no client ou usar um fallback
      const isSpotify = url.includes('spotify.com');
      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
      
      let platform = 'unknown';
      let title = 'Música Compartilhada';
      let type = 'track';
      let externalId = Date.now().toString();

      if (isSpotify) platform = 'spotify';
      else if (isYoutube) platform = 'youtube';
      else platform = 'deezer';

      // 1. Salva a track no banco (ou usa uma existente - MVP mockado)
      const { data: trackData, error: trackError } = await supabase.from('music_tracks').insert([{
        provider: platform,
        provider_track_id: externalId,
        title,
        artist: 'Artista Desconhecido', // Mock
        cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=300&q=80'
      }]).select('id').single();

      if (trackError) throw trackError;

      // 2. Publica no Feed Principal do FéConecta
      const { error: insertError } = await supabase.from('posts').insert([{
        author_id: user.id,
        user_id: user.id,
        content: reflection ? `${reflection}\n\n🎵 Louvor no FéMusic:\n${url}` : `🎵 Compartilhando um louvor que me abençoou:\n${url}`,
        media_url: url,
        post_type: 'text'
      }]);

      if (insertError) throw insertError;

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
            className="bg-white dark:bg-[#1a1b1e] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative"
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
            <div className="p-6 flex flex-col gap-4">
              {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-xl">{error}</div>}
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Link (Spotify, YouTube)</label>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 flex items-center pointer-events-none text-gray-400">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Cole o link da música ou playlist..."
                    className="w-full bg-gray-100 dark:bg-black/50 border border-transparent focus:border-whatsapp-teal/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Sua Reflexão (Opcional)</label>
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="O que Deus falou com você através dessa música?"
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-gray-100 dark:bg-black/50 border border-transparent focus:border-whatsapp-teal/50 rounded-2xl p-4 outline-none transition-all resize-none font-medium text-sm text-gray-800 dark:text-gray-200"
                />
                <div className="text-right text-[10px] text-gray-400 font-bold mt-1">
                  {reflection.length}/1000
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!url || loading}
                className="w-full bg-whatsapp-teal text-white font-black py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center mt-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Compartilhar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
