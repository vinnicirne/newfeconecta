"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoriesBar({ storyGroups, myStoryGroup, currentUser, onAddStory, onViewGroup }: any) {

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const Avatar = ({ src, name }: any) => {
    const isPlaceholder = src && (src.includes('avatar.vercel.sh') || src.includes('dicebear'));
    return (src && !isPlaceholder)
      ? <img src={src} className="w-full h-full object-cover" alt={name} />
      : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white font-black text-xs md:text-xl uppercase shadow-inner">
          {getInitials(name)}
        </div>;
  };

  const otherStoryGroups = storyGroups.filter((g: any) => g.author_id !== currentUser?.id);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          📱 MOBILE: FORMATO CIRCULAR IDÊNTICO AO INSTAGRAM (< md)
          ───────────────────────────────────────────────────────────── */}
      <div 
        className="flex md:hidden items-center gap-3.5 px-4 py-3 overflow-x-auto no-scrollbar scroll-smooth border-b border-border/40 bg-background/50 backdrop-blur-sm"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Meu Story (Instagram Style Circular) */}
        <button
          onClick={myStoryGroup ? () => onViewGroup(myStoryGroup) : onAddStory}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="relative">
            <div className={cn(
              "w-[66px] h-[66px] rounded-full p-[2.5px] transition-all",
              myStoryGroup 
                ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 shadow-sm" 
                : "bg-transparent border-2 border-dashed border-muted-foreground/30"
            )}>
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-background bg-card">
                <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
              </div>
            </div>

            {/* Botão de + Flutuante */}
            <div 
              onClick={(e) => { e.stopPropagation(); onAddStory(); }}
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-whatsapp-teal text-white flex items-center justify-center border-2 border-background shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          <span className="text-[11px] font-medium text-foreground tracking-tight max-w-[68px] truncate text-center">
            Seu story
          </span>
        </button>

        {/* Stories de Outros Usuários (Instagram Style Circular) */}
        {otherStoryGroups.map((group: any) => (
          <button
            key={group.author_id}
            onClick={() => onViewGroup(group)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="relative">
              {/* Anel Gradiente de Story Não Visto vs Cinza de Visto */}
              <div className={cn(
                "w-[66px] h-[66px] rounded-full p-[2.5px] transition-all",
                group.allViewed 
                  ? "bg-muted-foreground/30" 
                  : "bg-gradient-to-tr from-amber-500 via-rose-500 to-whatsapp-green shadow-sm animate-in fade-in"
              )}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-background bg-card">
                  <Avatar src={group.author_avatar} name={group.author_name} />
                </div>
              </div>

              {/* Tag AO VIVO */}
              {group.is_live && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-md border border-background">
                  AO VIVO
                </div>
              )}
            </div>

            <span className="text-[11px] font-medium text-foreground tracking-tight max-w-[68px] truncate text-center">
              {group.author_name?.split(' ')[0] || "Membro"}
            </span>
          </button>
        ))}
      </div>


      {/* ─────────────────────────────────────────────────────────────
          💻 DESKTOP / WEB: FORMATO RETANGULAR DE CARDS VERTICAIS (>= md)
          ───────────────────────────────────────────────────────────── */}
      <div 
        className="hidden md:flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar scroll-smooth" 
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Meu Story - Retangular */}
        <button
          onClick={myStoryGroup ? () => onViewGroup(myStoryGroup) : onAddStory}
          className="relative w-28 md:w-32 h-44 md:h-52 rounded-2xl overflow-hidden flex-shrink-0 group shadow-md border border-border cursor-pointer hover:opacity-95 transition-all bg-card"
        >
          {myStoryGroup ? (
            <div className="w-full h-full relative">
              <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
              <div className="absolute top-3 left-3 w-10 h-10 rounded-full border-2 border-whatsapp-green overflow-hidden shadow-sm">
                <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
              </div>
              <span className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold drop-shadow-md text-left truncate">
                Meu status
              </span>
              <div 
                onClick={(e) => { e.stopPropagation(); onAddStory(); }}
                className="absolute bottom-10 right-2 w-8 h-8 rounded-full bg-whatsapp-teal text-white flex items-center justify-center border-2 border-card shadow-lg hover:scale-110 transition-all z-20"
              >
                <Plus className="w-4 h-4 font-bold" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              <div className="h-[65%] w-full relative overflow-hidden bg-muted/40">
                <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="h-[35%] w-full relative flex flex-col items-center justify-end pb-3 bg-card">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-whatsapp-teal text-white rounded-full flex items-center justify-center border-4 border-card shadow-sm z-10 transition-transform group-hover:scale-110">
                  <Plus className="w-5 h-5 font-black" />
                </div>
                <span className="text-[11px] font-bold text-foreground mt-1">Criar história</span>
              </div>
            </div>
          )}
        </button>

        {/* Outros Stories - Retangular */}
        {otherStoryGroups.map((group: any) => (
          <button
            key={group.author_id}
            onClick={() => onViewGroup(group)}
            className="relative w-28 md:w-32 h-44 md:h-52 rounded-2xl overflow-hidden flex-shrink-0 group shadow-md border border-border cursor-pointer hover:opacity-95 transition-all"
          >
            <div className="w-full h-full relative">
              <Avatar src={group.author_avatar} name={group.author_name} />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 group-hover:bg-black/20 transition-colors" />
              
              {/* Indicador de Avatar com Borda */}
              <div className={cn(
                "absolute top-3 left-3 w-10 h-10 rounded-full border-2 overflow-hidden shadow-sm",
                group.allViewed ? "border-muted-foreground/40" : "border-whatsapp-green"
              )}>
                <Avatar src={group.author_avatar} name={group.author_name} />
              </div>

              {/* Tag AO VIVO */}
              {group.is_live && (
                <div className="absolute top-14 left-3 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-lg">
                  AO VIVO
                </div>
              )}

              <span className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold truncate text-left drop-shadow-md">
                {group.author_name?.split(' ')[0] || "Membro"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
