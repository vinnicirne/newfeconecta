"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Facebook, Link2, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  postContent?: string;
}

export default function ShareModal({ isOpen, onClose, url, title, postContent }: ShareModalProps) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !!navigator.share) {
      setCanShare(true);
    }
  }, []);

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: <MessageCircle className="w-5 h-5 text-[#25D366]" />,
      color: "bg-[#25D366]/10",
      action: () => {
        const text = `${title}\n\n${postContent ? postContent.substring(0, 100) + '...' : ''}\n\nVeja mais em: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      }
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-5 h-5 text-[#1877F2]" />,
      color: "bg-[#1877F2]/10",
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
      }
    },
    {
      name: "Copiar Link",
      icon: <Link2 className="w-5 h-5 text-gray-500" />,
      color: "bg-gray-100",
      action: () => {
        navigator.clipboard.writeText(url);
        toast.success("Link copiado com sucesso!");
        onClose();
      }
    }
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: postContent?.substring(0, 100),
          url
        });
        onClose();
      } catch (err) {
        console.error("Native share failed:", err);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md rounded-t-[36px] sm:rounded-3xl p-0 overflow-hidden border border-black/5 dark:border-white/10 shadow-2xl bg-white dark:bg-[#111b21] z-[120] animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-3.5 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
        </div>

        <div className="px-6 pt-4 pb-2">
          <DialogTitle className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">
            Compartilhar Fé
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 font-semibold tracking-wide mt-0.5">
            Espalhe a palavra com um toque
          </DialogDescription>
        </div>
        
        <div className="px-6 pb-6 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}>
          {/* Preview Card para Identificação */}
          <div className="mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-[#202c33] border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-whatsapp-teal/15 flex items-center justify-center flex-shrink-0">
                <Share2 className="w-6 h-6 text-whatsapp-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black truncate text-gray-900 dark:text-white uppercase tracking-tight">{title}</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-300 line-clamp-2 mt-0.5 leading-snug">{postContent || "Confira este conteúdo exclusivo no FéConecta."}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.action}
                className="flex flex-col items-center gap-2 group p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-active:scale-95 shadow-sm",
                  option.color
                )}>
                  {option.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 group-hover:text-whatsapp-teal transition-colors">
                  {option.name}
                </span>
              </button>
            ))}
          </div>

          {canShare && (
            <Button 
              onClick={handleNativeShare}
              className="w-full h-12 rounded-2xl bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-whatsapp-teal/20 active:scale-[0.98] transition-all"
            >
              <Share2 className="w-4 h-4" /> Mais Opções
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
