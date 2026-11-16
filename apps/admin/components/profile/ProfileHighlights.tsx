"use client";

import React from "react";
import Image from "next/image";
import { Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileHighlightsProps {
  highlights: any[];
  userStories: any[];
  setIsStoryCreatorOpen: (open: boolean) => void;
  setIsStoryViewerOpen: (open: boolean) => void;
  setUserStories: (stories: any[]) => void;
  setEditingHighlight: (story: any) => void;
  setIsHighlightModalOpen: (open: boolean) => void;
}

export function ProfileHighlights({
  highlights,
  userStories,
  setIsStoryCreatorOpen,
  setIsStoryViewerOpen,
  setUserStories,
  setEditingHighlight,
  setIsHighlightModalOpen
}: ProfileHighlightsProps) {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
      {/* Botão de Adicionar Story */}
      <button
        type="button"
        onClick={() => setIsStoryCreatorOpen(true)}
        aria-label="Adicionar story"
        className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal"
      >
        <div className="w-[72px] h-[72px] rounded-[24px] border-2 border-dashed border-white/20 group-hover:border-whatsapp-green/50 transition-all flex items-center justify-center relative bg-white/5">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" aria-hidden="true" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-whatsapp-green rounded-full border-2 border-[#0f0f0f] flex items-center justify-center shadow-lg">
            <Plus className="w-4 h-4 text-whatsapp-dark" aria-hidden="true" />
          </div>
        </div>
        <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 tracking-widest uppercase">Adicionar</span>
      </button>

      {highlights.map((h: any) => (
        <div
          key={h.title}
          className="relative flex flex-col items-center gap-2 flex-shrink-0 group"
        >
          <button type="button" onClick={() => { setUserStories(h.stories); setIsStoryViewerOpen(true); }} aria-label={`Ver destaque ${h.title}`} className="flex flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">
          <div className="w-[72px] h-[72px] rounded-[24px] p-[2px] bg-gradient-to-tr from-whatsapp-green/40 to-emerald-400/40 group-hover:from-whatsapp-green group-hover:to-emerald-400 transition-colors flex items-center justify-center relative shadow-xl">
            <div className="w-full h-full rounded-[22px] border-2 border-[#0f0f0f] overflow-hidden bg-gray-900 flex items-center justify-center">
              {h.cover_url ? (
                <Image 
                  src={h.cover_url} 
                  width={72} 
                  height={72} 
                  unoptimized
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] p-2 text-center font-bold bg-whatsapp-green/20">
                  {h.title}
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-black text-gray-700 dark:text-gray-200 tracking-widest uppercase truncate w-20 text-center">{h.title}</span>
          </button>
          <button type="button" onClick={() => { setEditingHighlight(h.stories[0]); setIsHighlightModalOpen(true); }} aria-label={`Editar destaque ${h.title}`} className="absolute -top-1 -right-1 w-7 h-7 bg-[#1a1a1a] backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shadow-2xl z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">
            <Settings2 className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
