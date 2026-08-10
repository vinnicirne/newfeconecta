import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MediaCapture } from '../../UnifiedComposer';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MediaPreviewProps {
  captured: MediaCapture;
  content: string;
  onContentChange: (content: string) => void;
  onClear: () => void;
  disabled?: boolean;
}


export function MediaPreview({ captured, content, onContentChange, onClear, onPublish, disabled }: MediaPreviewProps & { onPublish?: () => void }) {
  const [filter, setFilter] = useState<string>('none');

  const FILTERS = [
    { id: 'none', label: 'Normal', css: 'none' },
    { id: 'grayscale', label: 'P&B', css: 'grayscale(100%)' },
    { id: 'sepia', label: 'Sépia', css: 'sepia(80%)' },
    { id: 'contrast', label: 'Intenso', css: 'contrast(120%) saturate(120%)' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative w-full h-full bg-black flex flex-col items-center justify-center flex-1 overflow-hidden"
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClear();
        }}
        disabled={disabled}
        className="absolute top-[calc(env(safe-area-inset-top)+1.5rem)] left-6 z-20 p-2 bg-black/40 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
      >
        <X className="w-5 h-5 drop-shadow-md" />
      </button>

      {captured.type === 'photo' && (
        <>
          <img 
            src={captured.url} 
            alt="Captura" 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: FILTERS.find(f => f.id === filter)?.css }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        </>
      )}

      {captured.type === 'video' && (
        <>
          <video 
            src={captured.url} 
            autoPlay
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        </>
      )}

      {(captured.type === 'photo' || captured.type === 'video') && (
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-6 z-20 pointer-events-auto">
          {captured.type === 'photo' && (
            <div className="flex justify-center gap-2 mb-2">
              <div className="bg-black/60 backdrop-blur-md rounded-full p-1.5 flex gap-1">
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-full transition-all",
                      filter === f.id ? "bg-white text-black" : "text-white/70 hover:text-white"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-3xl p-4 flex flex-col gap-4 shadow-xl">
            <textarea
              autoFocus
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Toque para adicionar uma descrição..."
              className="w-full bg-transparent border-none focus:ring-0 text-white text-lg font-medium placeholder:text-white/60 resize-none"
              rows={2}
              disabled={disabled}
            />
            
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </div>
                <div>
                   <p className="text-xs font-bold leading-none">Compartilhar em</p>
                   <p className="text-[10px] text-white/60">Story: Desativado</p>
                </div>
              </div>

              <button 
                onClick={onPublish}
                disabled={disabled}
                className="px-6 py-2.5 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {disabled ? "ENVIANDO..." : "PUBLICAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {captured.type === 'audio' && (
        <div className="p-8 w-full h-full flex flex-col items-center justify-center gap-4 bg-[#1E1E1E] z-20">
          <div className="w-16 h-16 rounded-full bg-whatsapp-teal/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-whatsapp-teal animate-pulse" />
          </div>
          <audio src={captured.url} controls className="w-full max-w-sm" />
          <div className="mt-8 flex gap-4 w-full max-w-sm">
             <button onClick={onClear} className="flex-1 py-3 bg-red-500/10 text-red-500 font-bold rounded-full">Refazer</button>
             <button onClick={onPublish} disabled={disabled} className="flex-1 py-3 bg-whatsapp-teal text-white font-bold rounded-full">Publicar</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

//