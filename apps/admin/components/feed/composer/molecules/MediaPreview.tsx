import { motion } from 'framer-motion';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { MediaCapture } from '../../UnifiedComposer';
import { cn } from '@/lib/utils';
import { useState, useRef, useCallback, useEffect } from 'react';

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
  const [carouselIndex, setCarouselIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const carouselUrls = captured.imageUrls || [captured.url];
  const isCarousel = carouselUrls.length > 1;

  useEffect(() => setCarouselIndex(0), [captured.url]);

  useEffect(() => {
    const textarea = captionRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [content]);

  const scrollToCarouselImage = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, carouselUrls.length - 1));
    const container = carouselRef.current;
    if (container) container.scrollTo({ left: container.clientWidth * nextIndex, behavior: 'smooth' });
    setCarouselIndex(nextIndex);
  };

  /**
   * Bug 8 fix: Para fotos com filtro ativo, re-renderiza a imagem num canvas
   * com ctx.filter aplicado, gera um novo blob JPEG e passa ao onPublish.
   * Isso garante que a foto publicada seja exatamente o que o usuário viu.
   */
  const handlePublishWithFilter = useCallback(async () => {
    if (!onPublish) return;

    // Vídeo e áudio — sem filtro, passa direto
    if (captured.type !== 'photo' || isCarousel || filter === 'none') {
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
  }, [onPublish, captured, filter, isCarousel]);

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

      {captured.type === 'photo' && isCarousel && (
        <>
          <div
            ref={carouselRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              const nextIndex = Math.round(element.scrollLeft / Math.max(element.clientWidth, 1));
              setCarouselIndex((current) => current === nextIndex ? current : nextIndex);
            }}
            className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth no-scrollbar"
            aria-label="Fotos do carrossel"
          >
            {carouselUrls.map((url, index) => (
              <div key={url} className="relative h-full w-full shrink-0 snap-start bg-black">
                <Image src={url} alt={`Foto ${index + 1} de ${carouselUrls.length}`} fill unoptimized sizes="100vw" className="object-contain" />
              </div>
            ))}
          </div>
          <div className="absolute right-5 top-[calc(env(safe-area-inset-top)+5rem)] z-20 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            <Images className="h-3.5 w-3.5" /> {carouselIndex + 1}/{carouselUrls.length}
          </div>
          {carouselIndex > 0 && (
            <button type="button" aria-label="Foto anterior" onClick={() => scrollToCarouselImage(carouselIndex - 1)} className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {carouselIndex < carouselUrls.length - 1 && (
            <button type="button" aria-label="Próxima foto" onClick={() => scrollToCarouselImage(carouselIndex + 1)} className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <div className="absolute bottom-36 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
            {carouselUrls.map((url, index) => <span key={url} className={cn("h-1.5 rounded-full transition-all", index === carouselIndex ? "w-4 bg-white" : "w-1.5 bg-white/50")} />)}
          </div>
        </>
      )}

      {captured.type === 'photo' && !isCarousel && (
        <>
          <Image
            key={captured.url}
            ref={imgRef}
            src={captured.url}
            alt="Prévia da imagem"
            fill
            unoptimized
            sizes="100vw"
            className="object-cover"
            style={{ filter: FILTERS.find(f => f.id === filter)?.css }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        </>
      )}

      {captured.type === 'video' && (
        <>
          <video 
            key={captured.url}
            src={captured.url} 
            autoPlay
            loop
            muted
            playsInline
            controlsList="nodownload"
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        </>
      )}

      {(captured.type === 'photo' || captured.type === 'video') && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 z-20 pointer-events-auto max-h-[65dvh] overflow-y-auto overscroll-contain">
      {captured.type === 'photo' && !isCarousel && (
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

          <div className="w-full bg-black/75 backdrop-blur-xl border border-white/20 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="post-media-caption" className="text-sm font-semibold text-white">
                Legenda
                <span className="ml-1 font-normal text-white/60">· opcional</span>
              </label>
              <span className="text-xs tabular-nums text-white/65" aria-live="polite">
                {content.length}/2.200
              </span>
            </div>
            <textarea
              ref={captionRef}
              id="post-media-caption"
              value={content}
              onChange={(e) => onContentChange(e.target.value.slice(0, 2200))}
              placeholder="Escreva uma legenda para sua foto ou vídeo…"
              aria-label="Legenda da publicação"
              maxLength={2200}
              className="w-full min-h-12 max-h-[120px] overflow-y-auto bg-white/10 border border-white/10 rounded-2xl px-3 py-3 text-white text-base leading-relaxed placeholder:text-white/55 resize-none focus:outline-none focus:ring-2 focus:ring-white/70 focus:border-transparent"
              rows={2}
              disabled={isPublishing}
            />
            <p className="-mt-1 text-xs text-white/60">A legenda será exibida junto com a mídia no feed.</p>
            
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </div>
                <div>
                   <p className="text-xs font-bold leading-none">Compartilhar em</p>
                   <p className="text-[10px] text-white/60">{isCarousel ? `Carrossel · ${carouselUrls.length} fotos` : 'Compartilhado no seu feed'}</p>
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