'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const slidesKey = urls.join('\u0000');

  useEffect(() => {
    setActiveIndex(0);
    setFailedUrls(new Set());
    setRetryCounts({});
    viewportRef.current?.scrollTo({ left: 0 });
  }, [slidesKey]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, []);

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
      className="group/post-carousel relative aspect-[4/5] w-full overflow-hidden bg-black"
      role="region"
      aria-roledescription="carrossel"
      aria-label={`Publicação com ${urls.length} imagens`}
      onDoubleClick={onDoubleClick}
    >
      <div
        ref={viewportRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
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
    </section>
  );
}
