'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '../../infrastructure/state/usePlaylistStore';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { ListPlus, Plus, Check, Loader2, Music, ListMusic } from 'lucide-react';
import CreatePlaylistModal from './CreatePlaylistModal';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: MusicTrack | null;
}

export default function AddToPlaylistModal({ isOpen, onClose, track }: AddToPlaylistModalProps) {
  const { playlists, loadPlaylists, addTrackToPlaylist } = usePlaylistStore();
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen, loadPlaylists]);

  if (!track) return null;

  const trackId = track.providerTrackId || track.id;

  const handleAdd = async (playlistId: string) => {
    setAddingId(playlistId);
    await addTrackToPlaylist(playlistId, track);
    setAddingId(null);
    onClose();
  };

  const handleCreated = async (newPlaylistId: string) => {
    await addTrackToPlaylist(newPlaylistId, track);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-md bg-white dark:bg-[#1a1b1e] border-gray-100 dark:border-white/10 rounded-3xl p-6 text-gray-900 dark:text-white shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                {track.cover ? (
                  <img src={track.cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-black truncate">{track.title}</DialogTitle>
                <DialogDescription className="text-xs text-gray-500 truncate">
                  {track.artist || 'Escolha a playlist de destino'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            {/* Botão de Nova Playlist */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full p-3 rounded-2xl border border-dashed border-whatsapp-teal/40 bg-whatsapp-teal/5 hover:bg-whatsapp-teal/10 text-whatsapp-teal font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Criar Nova Playlist
            </button>

            {/* Lista de Playlists */}
            <div className="max-h-60 overflow-y-auto space-y-2 pt-2 pr-1 custom-scrollbar">
              {playlists.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  Você ainda não possui playlists criadas.
                </div>
              ) : (
                playlists.map((playlist) => {
                  const isAlreadyIn = (playlist.tracks || []).some(
                    (t) => (t.providerTrackId || t.id) === trackId
                  );
                  const isAdding = addingId === playlist.id;

                  return (
                    <button
                      key={playlist.id}
                      onClick={() => !isAlreadyIn && handleAdd(playlist.id)}
                      disabled={isAlreadyIn || isAdding}
                      className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all border
                        ${isAlreadyIn 
                          ? 'bg-gray-50 dark:bg-white/5 border-transparent opacity-60 cursor-default' 
                          : 'bg-white dark:bg-[#202124] border-gray-100 dark:border-white/5 hover:border-whatsapp-teal/40 hover:scale-[1.01] active:scale-[0.98]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-whatsapp-teal/10 text-whatsapp-teal flex items-center justify-center shrink-0 overflow-hidden">
                          {playlist.coverUrl ? (
                            <img src={playlist.coverUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <ListMusic className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{playlist.title}</p>
                          <p className="text-xs text-gray-400">{playlist.trackCount} louvores</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAdding ? (
                          <Loader2 className="w-4 h-4 animate-spin text-whatsapp-teal" />
                        ) : isAlreadyIn ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-whatsapp-teal">
                            <Check className="w-3.5 h-3.5" /> Na playlist
                          </span>
                        ) : (
                          <Plus className="w-4 h-4 text-gray-400 hover:text-whatsapp-teal" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submodal para criar playlist e já adicionar */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreated}
      />
    </>
  );
}
