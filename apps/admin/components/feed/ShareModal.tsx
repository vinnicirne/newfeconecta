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
      <DialogContent className="fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md rounded-t-[40px] sm:rounded-4xl p-0 overflow-hidden border-none shadow-2xl dark:bg-[#0c0c0c] animate-in slide-in-from-bottom duration-500">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-white/10" />
        </div>

        <div className="px-8 pt-6 pb-4">
          <DialogTitle className="text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white">
            Compartilhar Fé
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 font-bold uppercase mt-1 opacity-50">
            Espalhe a palavra com um clique
          </DialogDescription>
        </div>
        
        <div className="px-8 pb-10">
          {/* Preview Card para Identificação */}
          <div className="mb-8 p-5 rounded-[32px] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                <Share2 className="w-7 h-7 text-whatsapp-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black truncate dark:text-white uppercase tracking-tight">{title}</h4>
                <p className="text-[11px] text-gray-500 font-bold line-clamp-2 mt-0.5 leading-tight">{postContent || "Confira este conteúdo exclusivo no FéConecta."}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-8">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.action}
                className="flex flex-col items-center gap-2.5 group"
              >
                <div className={cn(
                  "w-16 h-16 rounded-[24px] flex items-center justify-center transition-all group-active:scale-90 shadow-sm",
                  option.color
                )}>
                  {option.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tight text-gray-400 group-hover:text-whatsapp-teal transition-colors">
                  {option.name}
                </span>
              </button>
            ))}
          </div>

          {canShare && (
            <Button 
              onClick={handleNativeShare}
              className="w-full h-14 rounded-3xl bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-whatsapp-teal/20 active:scale-[0.98] transition-all"
            >
              <Share2 className="w-4 h-4" /> Mais Opções
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
