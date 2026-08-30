'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlaylistStore } from '../../infrastructure/state/usePlaylistStore';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { Plus, Check, Loader2, Music, ListMusic, X } from 'lucide-react';
import CreatePlaylistModal from './CreatePlaylistModal';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: MusicTrack | null;
}

export default function AddToPlaylistModal({ isOpen, onClose, track }: AddToPlaylistModalProps) {
  const { playlists, loadPlaylists, addTrackToPlaylist } = usePlaylistStore();
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
    setIsCreateOpen(false);
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10005] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Card / Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative w-full sm:max-w-md bg-[#181818] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 text-white shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {track.cover ? (
                    <img src={track.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6 text-[#3FFF8B]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold truncate leading-tight">{track.title}</h3>
                  <p className="text-xs text-[#A8A8A8] truncate mt-0.5">
                    {track.artist || 'Escolha a playlist de destino'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ação Criar Nova Playlist */}
            <div className="pt-4 shrink-0">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-full p-3.5 rounded-2xl border border-dashed border-[#3FFF8B]/40 bg-[#3FFF8B]/5 hover:bg-[#3FFF8B]/15 text-[#3FFF8B] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Criar Nova Playlist
              </button>
            </div>

            {/* Lista de Playlists */}
            <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1 custom-scrollbar min-h-0 mt-1">
              {playlists.length === 0 ? (
                <div className="text-center py-8 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                    <ListMusic className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-200">Você ainda não tem playlists</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    Clique no botão acima para criar sua primeira playlist e adicionar este louvor.
                  </p>
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
                          ? 'bg-white/5 border-transparent opacity-60 cursor-default' 
                          : 'bg-[#202020] border-white/5 hover:border-[#3FFF8B]/40 hover:bg-[#252525] active:scale-[0.98]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#3FFF8B]/10 text-[#3FFF8B] flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                          {playlist.coverUrl ? (
                            <img src={playlist.coverUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <ListMusic className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate text-white">{playlist.title}</p>
                          <p className="text-xs text-[#A8A8A8]">{playlist.trackCount || 0} louvores</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAdding ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#3FFF8B]" />
                        ) : isAlreadyIn ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-[#3FFF8B]">
                            <Check className="w-3.5 h-3.5" /> Na playlist
                          </span>
                        ) : (
                          <Plus className="w-4 h-4 text-gray-400 hover:text-[#3FFF8B]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null}

      {/* Submodal para criar playlist e já adicionar */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreated}
      />
    </>
  );
}
