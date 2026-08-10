"use client";

import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Search, Loader2, Image as ImageIcon } from "lucide-react";
import { searchUnsplashImages } from "@/app/actions/unsplash";

export function UnsplashGalleryModal({ isOpen, onClose, onSelect, initialQuery }: any) {
  const [query, setQuery] = useState(initialQuery || "faith");
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || "faith");
      handleSearch(initialQuery || "faith", 1);
    }
  }, [isOpen, initialQuery]);

  const handleSearch = async (searchQuery: string, pageNum: number = 1) => {
    setLoading(true);
    try {
      const results = await searchUnsplashImages(searchQuery, pageNum);
      if (pageNum === 1) {
        setImages(results);
      } else {
        setImages(prev => [...prev, ...results]);
      }
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(query, 1);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold font-santuario text-zinc-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" /> Galeria Celestial
              </h2>
              <p className="text-sm text-zinc-500">Escolha uma capa inspiradora para sua jornada</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="p-4 sm:p-6 shrink-0 bg-muted/30">
            <div className="relative max-w-md">
              <Search className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar (ex: cross, worship, nature)..."
                className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {loading && page === 1 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span>Buscando inspirações celestiais...</span>
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                Nenhuma imagem encontrada para "{query}". Tente buscar em inglês.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {images.map((img) => (
                  <div 
                    key={img.id} 
                    onClick={() => {
                      onSelect(img.url);
                      onClose();
                    }}
                    className="relative group rounded-xl overflow-hidden aspect-[3/1] cursor-pointer border-2 border-transparent hover:border-amber-500 transition-all bg-muted"
                  >
                    <img src={img.thumb} alt="Unsplash" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white/80 line-clamp-1">Por {img.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {images.length > 0 && !loading && (
              <div className="flex justify-center mt-8 pb-4">
                <button 
                  onClick={() => handleSearch(query, page + 1)}
                  className="px-6 py-2 bg-muted text-foreground font-bold rounded-full hover:bg-border transition-colors text-sm"
                >
                  Carregar mais imagens
                </button>
              </div>
            )}
            {loading && page > 1 && (
              <div className="flex justify-center mt-8 pb-4">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            )}
          </div>
          
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
