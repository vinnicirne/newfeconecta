'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MusicPlaylist } from '../../domain/entities/MusicPlaylist';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { usePlaylistStore } from '../../infrastructure/state/usePlaylistStore';
import { usePlayerStore } from '../../infrastructure/state/usePlayerStore';
import { Play, Shuffle, Trash2, ListMusic, Loader2, Music, X, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface PlaylistViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: MusicPlaylist | null;
}

export default function PlaylistViewModal({ isOpen, onClose, playlist }: PlaylistViewModalProps) {
  const { loadPlaylistTracks, activePlaylistTracks, loadingTracks, removeTrackFromPlaylist, deletePlaylist } = usePlaylistStore();
  const { play, likedTracks, toggleLike } = usePlayerStore();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && playlist) {
      loadPlaylistTracks(playlist.id);
    }
  }, [isOpen, playlist, loadPlaylistTracks]);

  if (!playlist) return null;

  const handlePlayAll = (shuffle = false) => {
    if (!activePlaylistTracks || activePlaylistTracks.length === 0) {
      toast.warning('Adicione músicas a esta playlist para começar a ouvir.');
      return;
    }

    let queue = [...activePlaylistTracks];
    if (shuffle) {
      queue = queue.sort(() => Math.random() - 0.5);
    }

    play(queue[0], queue);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Deseja realmente excluir a playlist "${playlist.title}"?`)) return;
    setIsDeleting(true);
    const ok = await deletePlaylist(playlist.id);
    setIsDeleting(false);
    if (ok) {
      onClose();
    }
  };

  const coverImage = playlist.coverUrl || activePlaylistTracks[0]?.cover || null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#121316] border-gray-100 dark:border-white/10 rounded-3xl p-0 text-gray-900 dark:text-white shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header com Capa e Gradiente */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-whatsapp-teal/20 to-transparent flex items-start gap-4">
          <div className="w-24 h-24 rounded-2xl bg-whatsapp-teal/10 shadow-lg shrink-0 overflow-hidden flex items-center justify-center border border-white/20">
            {coverImage ? (
              <img src={coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <ListMusic className="w-10 h-10 text-whatsapp-teal" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-whatsapp-teal bg-whatsapp-teal/10 px-2 py-0.5 rounded-md">
              Playlist Pessoal
            </span>
            <DialogTitle className="text-xl font-black truncate mt-1">{playlist.title}</DialogTitle>
            {playlist.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{playlist.description}</p>
            )}
            <p className="text-xs text-gray-400 font-medium mt-1">
              {activePlaylistTracks.length} {activePlaylistTracks.length === 1 ? 'louvor' : 'louvores'}
            </p>
          </div>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="px-6 py-2 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handlePlayAll(false)}
              disabled={activePlaylistTracks.length === 0}
              className="bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 shadow-md shadow-whatsapp-teal/20"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Tocar Todas
            </Button>
            <Button
              onClick={() => handlePlayAll(true)}
              disabled={activePlaylistTracks.length === 0}
              variant="outline"
              className="rounded-xl border-gray-200 dark:border-white/10 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Aleatório
            </Button>
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Excluir Playlist"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Lista de Faixas com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 pt-3 space-y-2 custom-scrollbar">
          {loadingTracks ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-whatsapp-teal" />
            </div>
          ) : activePlaylistTracks.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                <Music className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Nenhum louvor adicionado</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Ao ouvir ou buscar qualquer música no FéMusic, clique no ícone de adicionar à playlist para salvá-la aqui.
              </p>
            </div>
          ) : (
            activePlaylistTracks.map((track, index) => {
              const trackId = track.providerTrackId || track.id;
              const isLiked = likedTracks.some((t) => (t.providerTrackId || t.id) === trackId);

              return (
                <div
                  key={trackId || index}
                  onClick={() => play(track, activePlaylistTracks)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-bold text-gray-400 w-4 text-center">
                      {index + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                      {track.cover ? (
                        <img src={track.cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate group-hover:text-whatsapp-teal transition-colors">
                        {track.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{track.artist || 'Artista'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track);
                      }}
                      className="p-2 transition-transform active:scale-90 text-gray-400 hover:text-red-500"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrackFromPlaylist(playlist.id, trackId);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover da playlist"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
