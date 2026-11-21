'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type PostCarouselProps = {
  urls: string[];
  priority?: boolean;
  onDoubleClick?: (event: MouseEvent<HTMLDivElement>) => void;
};

function mediaUrlForRetry(url: string, retry: number) {
  if (!retry) return url;
  const hashIndex = url.indexOf('#');
  const path = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const fragment = hashIndex >= 0 ? url.slice(hashIndex) : '';
  return `${path}${path.includes('?') ? '&' : '?'}sw=bypass&retry=${retry}${fragment}`;
}

export default function PostCarousel({ urls, priority = false, onDoubleClick }: PostCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const slidesKey = urls.join('\u0000');
  const activeRatio = imageRatios[urls[activeIndex]];

  useEffect(() => {
    setActiveIndex(0);
    setFailedUrls(new Set());
    setRetryCounts({});
    setImageRatios({});
    setIsZoomed(false);
    viewportRef.current?.scrollTo({ left: 0 });
  }, [slidesKey]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    if (!isZoomed) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsZoomed(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isZoomed]);

  const handleScroll = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const width = viewport.clientWidth || 1;
      const nextIndex = Math.max(0, Math.min(urls.length - 1, Math.round(viewport.scrollLeft / width)));
      setActiveIndex(current => current === nextIndex ? current : nextIndex);
      animationFrameRef.current = null;
    });
  }, [urls.length]);

  const goTo = (index: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const boundedIndex = Math.max(0, Math.min(urls.length - 1, index));
    viewport.scrollTo({ left: boundedIndex * viewport.clientWidth, behavior: 'smooth' });
    setActiveIndex(boundedIndex);
  };

  if (urls.length === 0) return null;

  return (
    <section
      className="group/post-carousel relative w-full overflow-hidden"
      style={{ aspectRatio: activeRatio || 0.8 }}
      role="region"
      aria-roledescription="carrossel"
      aria-label={`Publicação com ${urls.length} imagens`}
      onDoubleClick={onDoubleClick}
      onClick={() => {
        if (performance.now() < suppressClickUntilRef.current) return;
        setIsZoomed(current => !current);
      }}
    >
      <div
        ref={viewportRef}
        className={cn('flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', isDragging ? 'cursor-grabbing snap-none' : 'md:cursor-grab')}
        onScroll={handleScroll}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
          const viewport = viewportRef.current;
          if (!viewport) return;
          dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: viewport.scrollLeft, moved: false };
          setIsDragging(true);
          viewport.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const viewport = viewportRef.current;
          if (!drag || drag.pointerId !== event.pointerId || !viewport) return;
          const distance = event.clientX - drag.startX;
          if (Math.abs(distance) > 4) drag.moved = true;
          if (drag.moved) viewport.scrollLeft = drag.startScrollLeft - distance;
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (drag.moved) suppressClickUntilRef.current = performance.now() + 250;
          dragRef.current = null;
          setIsDragging(false);
          if (viewportRef.current?.hasPointerCapture(event.pointerId)) viewportRef.current.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setIsDragging(false);
        }}
        onDragStart={(event) => event.preventDefault()}
        aria-live="polite"
      >
        {urls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative h-full w-full flex-none snap-start"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${urls.length}`}
          >
            {failedUrls.has(url) ? (
              <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/70" role="status">
                Não foi possível carregar esta imagem.
              </div>
            ) : (
              <Image
                src={mediaUrlForRetry(url, retryCounts[url] || 0)}
                fill
                unoptimized
                priority={priority && index === 0}
                sizes="(max-width: 768px) 100vw, 672px"
                className="select-none object-contain"
                alt={`Imagem ${index + 1} da publicação`}
                draggable={false}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (!image.naturalWidth || !image.naturalHeight) return;
                  const ratio = image.naturalWidth / image.naturalHeight;
                  setImageRatios(current => current[url] === ratio ? current : { ...current, [url]: ratio });
                }}
                onError={() => {
                  const retry = retryCounts[url] || 0;
                  if (retry < 1) setRetryCounts(current => ({ ...current, [url]: retry + 1 }));
                  else setFailedUrls(current => new Set(current).add(url));
                }}
              />
            )}
          </div>
        ))}
      </div>

      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur" aria-hidden="true">
        {activeIndex + 1}/{urls.length}
      </span>

      {urls.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            disabled={activeIndex === 0}
            onClick={event => { event.stopPropagation(); goTo(activeIndex - 1); }}
            className={cn('absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/post-carousel:opacity-100', activeIndex === 0 && 'pointer-events-none')}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            disabled={activeIndex >= urls.length - 1}
            onClick={event => { event.stopPropagation(); goTo(activeIndex + 1); }}
            className={cn('absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/post-carousel:opacity-100', activeIndex >= urls.length - 1 && 'pointer-events-none')}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
            {urls.map((url, index) => (
              <span key={`${url}-dot-${index}`} className={cn('h-1.5 rounded-full transition-all', activeIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60')} />
            ))}
          </div>
        </>
      )}

      {isZoomed && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex cursor-zoom-out items-center justify-center bg-black/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Imagem ampliada da publicação"
          onClick={() => setIsZoomed(false)}
        >
          <Image
            src={mediaUrlForRetry(urls[activeIndex], retryCounts[urls[activeIndex]] || 0)}
            fill
            unoptimized
            priority
            sizes="100vw"
            className="select-none object-contain"
            alt={`Imagem ampliada ${activeIndex + 1} de ${urls.length}`}
            draggable={false}
          />
          <button
            type="button"
            aria-label="Fechar zoom"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={(event) => { event.stopPropagation(); setIsZoomed(false); }}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>,
        document.body,
      )}
    </section>
  );
}
