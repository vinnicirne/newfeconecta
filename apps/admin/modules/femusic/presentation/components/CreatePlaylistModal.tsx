'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePlaylistStore } from '../../infrastructure/state/usePlaylistStore';
import { ListMusic, Sparkles, Loader2 } from 'lucide-react';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white dark:bg-[#1a1b1e] border-gray-100 dark:border-white/10 rounded-3xl p-6 text-gray-900 dark:text-white shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-whatsapp-teal/10 text-whatsapp-teal flex items-center justify-center mb-1">
            <ListMusic className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black">Criar Nova Playlist</DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Reúna seus louvores e orações favoritos para ouvir a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Nome da Playlist <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Clamor da Madrugada, Adoração Íntima..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-teal"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              placeholder="Ex: Músicas para momentos de silêncio e busca..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-teal resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold rounded-xl px-6 flex items-center gap-2 shadow-lg shadow-whatsapp-teal/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Criar Playlist
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
