'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Share2, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface MusicShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackTitle: string;
  trackArtist: string;
  trackCover?: string;
  youtubeId: string;
}

export default function MusicShareModal({
  isOpen, onClose, trackTitle, trackArtist, trackCover, youtubeId
}: MusicShareModalProps) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

  const safeCopy = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
        document.body.appendChild(el); el.select();
        document.execCommand('copy'); document.body.removeChild(el);
      }
      toast.success('Link copiado!');
      onClose();
    } catch (_) { toast.error('Não foi possível copiar.'); }
  };

  const shareToFeed = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Você precisa estar logado.'); return; }

      await supabase.from('posts').insert([{
        author_id: user.id,
        user_id: user.id,
        content: `🎵 Estou sendo abençoado por esse louvor!\n\n**${trackTitle}** — ${trackArtist}\n\n${youtubeUrl}`,
        media_url: youtubeUrl,
        post_type: 'text',
      }]);
      toast.success('Compartilhado no Feed FéConecta! 🙏');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao compartilhar no Feed.');
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({
        title: `${trackTitle} — ${trackArtist}`,
        text: `🎵 Ouça esse louvor: ${trackTitle} de ${trackArtist}`,
        url: youtubeUrl,
      });
      onClose();
    } catch (_) {}
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`🎵 Ouça esse louvor no FéConecta:\n*${trackTitle}* - ${trackArtist}\n${youtubeUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    onClose();
  };

  const options = [
    {
      icon: <MessageCircle className="w-5 h-5 text-green-400" />,
      bg: 'bg-green-400/10',
      label: 'Compartilhar no Feed FéConecta',
      sub: 'Publica esse louvor na sua linha do tempo',
      action: shareToFeed,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366]">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.989.574 3.842 1.565 5.407L2 22l4.741-1.519A9.94 9.94 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
        </svg>
      ),
      bg: 'bg-[#25D366]/10',
      label: 'Enviar pelo WhatsApp',
      sub: 'Compartilhe com amigos e grupos',
      action: shareWhatsApp,
    },
    {
      icon: <Copy className="w-5 h-5 text-gray-300" />,
      bg: 'bg-white/10',
      label: 'Copiar link',
      sub: youtubeUrl.slice(0, 40) + '...',
      action: () => safeCopy(youtubeUrl),
    },
    ...(typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? [{
      icon: <Share2 className="w-5 h-5 text-blue-400" />,
      bg: 'bg-blue-400/10',
      label: 'Mais opções',
      sub: 'Abre o menu nativo de compartilhamento',
      action: nativeShare,
    }] : []),
  ];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10001] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative bg-[#1a1a1a] rounded-t-3xl border-t border-white/10 z-10 overflow-hidden"
          >
            {/* Header com info da música */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/10">
              {trackCover && (
                <img src={trackCover} alt={trackTitle} className="w-12 h-12 rounded-xl object-cover shrink-0 shadow" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{trackTitle}</p>
                <p className="text-xs text-gray-400 truncate">{trackArtist}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Opções */}
            <div className="px-4 py-3 space-y-2 pb-8">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={opt.action}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${opt.bg}`}>
                    {opt.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{opt.label}</p>
                    <p className="text-xs text-gray-500 truncate">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
