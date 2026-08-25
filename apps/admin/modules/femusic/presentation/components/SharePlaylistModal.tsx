'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MusicPlaylist } from '../../domain/entities/MusicPlaylist';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ListMusic, Share2, Sparkles, Loader2, Music } from 'lucide-react';

interface SharePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: MusicPlaylist | null;
  tracks?: MusicTrack[];
}

export default function SharePlaylistModal({
  isOpen,
  onClose,
  playlist,
  tracks = []
}: SharePlaylistModalProps) {
  const [reflection, setReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!playlist) return null;

  const trackListPreview = tracks.slice(0, 3).map(t => `• ${t.title}`).join('\n');
  const coverImage = playlist.coverUrl || tracks[0]?.cover || null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para compartilhar no feed.');
        setIsSubmitting(false);
        return;
      }

      const postContent = reflection.trim()
        ? `${reflection.trim()}\n\n🎵 **Playlist FéMusic:** ${playlist.title}\n${trackListPreview ? `${trackListPreview}\n` : ''}✨ Ouça agora no FéMusic!`
        : `🎵 **Playlist FéMusic:** ${playlist.title}\n${playlist.description ? `_${playlist.description}_\n` : ''}${trackListPreview ? `${trackListPreview}\n` : ''}✨ Montei essa playlist e gostaria de abençoar você. Ouça agora no FéMusic!`;

      const { error } = await supabase.from('posts').insert([
        {
          author_id: user.id,
          user_id: user.id,
          content: postContent,
          media_url: coverImage || '',
          post_type: 'text'
        }
      ]);

      if (error) {
        throw error;
      }

      toast.success('Playlist compartilhada no Feed Principal com sucesso! 🙌');
      setReflection('');
      onClose();
    } catch (err: any) {
      console.error('[SharePlaylist] Erro ao postar:', err);
      toast.error('Falha ao compartilhar playlist: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white dark:bg-[#1a1b1e] border-gray-100 dark:border-white/10 rounded-3xl p-6 text-gray-900 dark:text-white shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-whatsapp-teal/10 text-whatsapp-teal flex items-center justify-center mb-1">
            <Share2 className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black">Compartilhar no Feed</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Publique sua playlist para edificar e inspirar toda a comunidade FéConecta.
          </DialogDescription>
        </DialogHeader>

        {/* Prévia da Playlist */}
        <div className="mt-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-whatsapp-teal/10 overflow-hidden flex items-center justify-center shrink-0">
            {coverImage ? (
              <img src={coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <ListMusic className="w-6 h-6 text-whatsapp-teal" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-whatsapp-teal uppercase tracking-wider">
              Playlist FéMusic
            </span>
            <p className="font-black text-sm truncate text-gray-900 dark:text-white">{playlist.title}</p>
            <p className="text-xs text-gray-400">
              {tracks.length > 0 ? `${tracks.length} louvores selecionados` : `${playlist.trackCount} louvores`}
            </p>
          </div>
        </div>

        <form onSubmit={handleShare} className="space-y-4 mt-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Sua mensagem / reflexão de fé
            </label>
            <textarea
              placeholder="Ex: Irmãos, montei essa playlist para o nosso momento de oração matinal..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-teal resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold rounded-xl px-5 text-xs flex items-center gap-2 shadow-lg shadow-whatsapp-teal/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Publicar no Feed
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
