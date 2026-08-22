import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MediaCapture } from '../../UnifiedComposer';
import { cn } from '@/lib/utils';
import { useState, useRef, useCallback } from 'react';

interface MediaPreviewProps {
  captured: MediaCapture;
  content: string;
  onContentChange: (content: string) => void;
  onClear: () => void;
  onPublish?: (overrideBlob?: Blob) => void;
  disabled?: boolean;
}

const FILTERS = [
  { id: 'none',      label: 'Normal',   css: 'none' },
  { id: 'grayscale', label: 'P&B',      css: 'grayscale(100%)' },
  { id: 'sepia',     label: 'Sépia',    css: 'sepia(80%)' },
  { id: 'contrast',  label: 'Intenso',  css: 'contrast(120%) saturate(120%)' },
];

export function MediaPreview({ captured, content, onContentChange, onClear, onPublish, disabled }: MediaPreviewProps) {
  const [filter, setFilter] = useState<string>('none');
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  /**
   * Bug 8 fix: Para fotos com filtro ativo, re-renderiza a imagem num canvas
   * com ctx.filter aplicado, gera um novo blob JPEG e passa ao onPublish.
   * Isso garante que a foto publicada seja exatamente o que o usuário viu.
   */
  const handlePublishWithFilter = useCallback(async () => {
    if (!onPublish) return;

    // Vídeo e áudio — sem filtro, passa direto
    if (captured.type !== 'photo' || filter === 'none') {
      onPublish();
      return;
    }

    setIsApplyingFilter(true);
    try {
      const img = imgRef.current;
      if (!img || !img.naturalWidth) {
        // Fallback: imagem ainda não carregou — aguarda
        await new Promise<void>((res) => {
          const tmpImg = new Image();
          tmpImg.crossOrigin = 'anonymous';
          tmpImg.onload = () => res();
          tmpImg.onerror = () => res();
          tmpImg.src = captured.url;
        });
      }

      const source = imgRef.current ?? (() => {
        const tmp = new Image();
        tmp.src = captured.url;
        return tmp;
      })();

      const w = source instanceof HTMLImageElement ? source.naturalWidth  : 1;
      const h = source instanceof HTMLImageElement ? source.naturalHeight : 1;

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { onPublish(); return; }

      const cssFilter = FILTERS.find(f => f.id === filter)?.css ?? 'none';
      // ctx.filter é amplamente suportado em Chrome/WebKit (Android/iOS WebView)
      ctx.filter = cssFilter;
      ctx.drawImage(source, 0, 0, w, h);

      const filteredBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });

      onPublish(filteredBlob ?? undefined);
    } catch (err) {
      console.error('[MediaPreview] filter apply failed:', err);
      // Fallback silencioso — publica sem filtro
      onPublish();
    } finally {
      setIsApplyingFilter(false);
    }
  }, [onPublish, captured, filter]);

  const isPublishing = disabled || isApplyingFilter;

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
        disabled={isPublishing}
        className="absolute top-[calc(env(safe-area-inset-top)+1.5rem)] left-6 z-20 p-2 bg-black/40 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
      >
        <X className="w-5 h-5 drop-shadow-md" />
      </button>

      {captured.type === 'photo' && (
        <>
          <img 
            ref={imgRef}
            src={captured.url} 
            alt="Captura" 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: FILTERS.find(f => f.id === filter)?.css }}
            crossOrigin="anonymous"
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
              disabled={isPublishing}
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
                onClick={handlePublishWithFilter}
                disabled={isPublishing}
                className="px-6 py-2.5 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isApplyingFilter ? "APLICANDO..." : isPublishing ? "ENVIANDO..." : "PUBLICAR"}
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
             <button onClick={() => onPublish?.()} disabled={isPublishing} className="flex-1 py-3 bg-whatsapp-teal text-white font-bold rounded-full">Publicar</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

//