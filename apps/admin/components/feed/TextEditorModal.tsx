"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BACKGROUNDS = [
  null,
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  '#1a1a2e',
  '#2d3436',
];

export default function TextEditorModal({ open, onClose, onSubmit }: any) {
  const [content, setContent] = useState('');
  const [bg, setBg] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({ content, background: bg, post_type: 'text' });
    setContent('');
    setBg(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl z-[200] max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle>O que você está pensando?</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4 pb-4">
          {/* Background picker */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Fundo da publicação</p>
            <div className="flex gap-2.5 flex-wrap">
              {BACKGROUNDS.map((b, i) => (
                <button
                  key={i}
                  onClick={() => setBg(b)}
                  className={cn(
                    "w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 active:scale-90 shadow-sm",
                    bg === b ? 'border-whatsapp-green scale-110 rotate-3' : 'border-transparent'
                  )}
                  style={{ background: b || '#f9fafb' }}
                />
              ))}
            </div>
          </div>

          {/* Styled Editor Area */}
          <div 
            className={cn(
               "min-h-[250px] rounded-3xl p-8 flex items-center justify-center transition-all duration-500 whatsapp-shadow border border-gray-100 dark:border-white/5",
               !bg && "bg-gray-50 dark:bg-whatsapp-dark"
            )}
            style={{ background: bg || undefined }}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              className={cn(
                "w-full bg-transparent border-none focus:ring-0 text-center text-xl font-bold placeholder:opacity-50 resize-none",
                bg ? "text-white placeholder:text-white" : "text-whatsapp-dark dark:text-white dark:placeholder:text-gray-600"
              )}
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1 rounded-2xl">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!content.trim()} className="flex-[2] rounded-2xl shadow-lg shadow-whatsapp-teal/20">Publicar Agora</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
