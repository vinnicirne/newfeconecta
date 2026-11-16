"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, Paperclip, FileIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import moment from "moment";

interface ChatOverlayProps {
  show: boolean;
  onClose: () => void;
  messages: any[];
  onSendMessage: (c: string, f?: File) => void;
  myRole: string;
}

export function ChatOverlay({ show, onClose, messages, onSendMessage }: ChatOverlayProps) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, show]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMessage("", file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <DialogPrimitive.Root open={show} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl" />
    <DialogPrimitive.Content className="fixed inset-0 z-[1001] flex flex-col pt-[max(env(safe-area-inset-top),1rem)] pb-[env(safe-area-inset-bottom)] text-white focus:outline-none">
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <DialogPrimitive.Title className="font-black uppercase text-[10px] tracking-[0.3em]">Mensagens da sala</DialogPrimitive.Title>
        <DialogPrimitive.Close asChild>
          <button type="button" aria-label="Fechar mensagens" className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fff8b]">
            <X size={20} aria-hidden="true" />
          </button>
        </DialogPrimitive.Close>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map(m => (
          <div key={m.id} className="flex items-start gap-4">
            <div className="size-9 rounded-full border border-white/10 overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0">
              {m.avatar_url ? (
                <img src={m.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-white font-bold text-xs uppercase">
                  {(m.user_name || "I")[0]}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-[#3fff8b]/80">{m.user_name}</p>
                <p className="text-[9px] text-white/30 uppercase font-bold">{moment(m.created_at).format('HH:mm')}</p>
              </div>
              <div className="space-y-2">
                {m.content && (
                  <p className="text-sm text-white leading-relaxed bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                    {m.content}
                  </p>
                )}
                {m.media_url && (
                    <div className="max-w-[80%] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        {m.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={m.media_url} width={640} height={480} className="w-full h-auto object-cover" alt="Imagem enviada na conversa" loading="lazy" />
                        ) : (
                            <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 text-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fff8b]">
                                <FileIcon size={16} className="text-primary" aria-hidden="true" /> Ver Arquivo Anexo
                            </a>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-8 bg-black/40 border-t border-white/5 pb-12">
        <div className="relative flex items-center gap-2">
          <input 
            type="file" 
            aria-label="Anexar imagem ou arquivo"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <button 
            type="button"
            aria-label="Anexar imagem ou arquivo"
            onClick={() => fileInputRef.current?.click()}
            className="size-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-primary transition-colors border border-white/5"
          >
            <Paperclip size={20} />
          </button>
          <div className="flex-1 relative">
            <input
              aria-label="Mensagem para a sala"
              autoComplete="off"
              name="room_message"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { onSendMessage(input); setInput(""); } }}
                placeholder="Digite sua mensagem de fé..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-6 text-sm text-white outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
                type="button"
                aria-label="Enviar mensagem"
                onClick={() => { if (input.trim()) { onSendMessage(input); setInput(""); } }}
                className="absolute right-1.5 top-1.5 size-9 bg-primary text-black rounded-full shadow-lg active:scale-95 transition-all flex items-center justify-center"
            >
                <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
