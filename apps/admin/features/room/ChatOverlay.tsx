"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import moment from "moment";

interface ChatOverlayProps {
  show: boolean;
  onClose: () => void;
  messages: any[];
  onSendMessage: (c: string) => void;
  myRole: string;
}

export function ChatOverlay({ show, onClose, messages, onSendMessage }: ChatOverlayProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex flex-col pt-12">
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <h3 className="text-white font-black uppercase text-[10px] tracking-[0.3em]">Intercessões ao Vivo</h3>
        <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-4">
            <img src={m.avatar_url || 'https://github.com/shadcn.png'} className="size-9 rounded-full border border-white/10" alt="" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-[#3fff8b]/80">{m.user_name}</p>
                <p className="text-[9px] text-white/30 uppercase font-bold">{moment(m.created_at).format('HH:mm')}</p>
              </div>
              <p className="text-sm text-white leading-relaxed bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5">
                {m.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-8 bg-black/40 border-t border-white/5 pb-12">
        <div className="relative">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { onSendMessage(input); setInput(""); } }}
            placeholder="Digite sua mensagem de fé..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-4.5 px-6 text-sm text-white outline-none focus:ring-1 focus:ring-[#3fff8b]/50"
          />
          <button
            onClick={() => { if (input.trim()) { onSendMessage(input); setInput(""); } }}
            className="absolute right-2 top-1.5 p-3 bg-[#3fff8b] text-black rounded-full shadow-lg active:scale-90 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
