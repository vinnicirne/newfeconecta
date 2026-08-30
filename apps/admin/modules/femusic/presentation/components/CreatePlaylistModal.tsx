'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '../../infrastructure/state/usePlaylistStore';
import { ListMusic, Sparkles, Loader2, X } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}

export default function CreatePlaylistModal({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createPlaylist } = usePlaylistStore();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const created = await createPlaylist(title, description);
    setIsSubmitting(false);

    if (created) {
      setTitle('');
      setDescription('');
      onClose();
      if (onSuccess) {
        onSuccess(created.id);
      }
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10010] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative w-full sm:max-w-md bg-[#181818] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 text-white shadow-2xl z-10 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3FFF8B]/10 text-[#3FFF8B] flex items-center justify-center border border-white/5">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Criar Nova Playlist</h3>
                  <p className="text-xs text-[#A8A8A8]">Monte sua seleção favorita de louvores</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Nome da Playlist <span className="text-[#3FFF8B]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Clamor da Madrugada, Adoração Íntima..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-xl bg-[#222] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3FFF8B] focus:ring-1 focus:ring-[#3FFF8B]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  placeholder="Ex: Músicas para momentos de silêncio e oração..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-xl bg-[#222] border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3FFF8B] focus:ring-1 focus:ring-[#3FFF8B] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || isSubmitting}
                  className="bg-[#3FFF8B] hover:bg-[#3FFF8B]/90 text-black font-bold rounded-xl px-5 flex items-center gap-2 shadow-lg shadow-[#3FFF8B]/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-black" />
                      Criar Playlist
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
