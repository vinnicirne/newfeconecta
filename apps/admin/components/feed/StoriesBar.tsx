"use client";

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
      : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white font-black text-xl uppercase shadow-inner">
          {getInitials(name)}
        </div>;
  };

  return (
    <div className="flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar scroll-smooth" style={{ scrollbarWidth: 'none' }}>
      
      {/* My Story - Rectangular */}
      <button
        onClick={myStoryGroup ? () => onViewGroup(myStoryGroup) : onAddStory}
        className="relative w-28 md:w-32 h-44 md:h-52 rounded-xl overflow-hidden flex-shrink-0 group shadow-md border border-gray-200 dark:border-white/10 cursor-pointer hover:opacity-90 transition-all bg-white dark:bg-[#1a1a1a]"
      >
        {myStoryGroup ? (
           <div className="w-full h-full relative">
             <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
             <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
             <div className="absolute top-3 left-3 w-10 h-10 rounded-full border-2 border-whatsapp-green overflow-hidden shadow-sm">
               <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
             </div>
             <span className="absolute bottom-3 left-3 right-3 text-white text-[10px] md:text-xs font-bold drop-shadow-md text-left truncate">
               Meu status
             </span>
             <div 
               onClick={(e) => { e.stopPropagation(); onAddStory(); }}
               className="absolute bottom-10 right-2 w-8 h-8 rounded-full bg-whatsapp-green flex items-center justify-center border-2 border-white dark:border-[#1a1a1a] shadow-lg hover:scale-110 transition-all z-20"
             >
               <Plus className="w-4 h-4 text-whatsapp-dark font-bold" />
             </div>
           </div>
        ) : (
           <div className="w-full h-full flex flex-col">
              <div className="h-[65%] w-full relative overflow-hidden bg-gray-100 dark:bg-[#0f0f0f]">
                <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="h-[35%] w-full relative flex flex-col items-center justify-end pb-2 md:pb-3 bg-white dark:bg-[#1a1a1a]">
                <div className="absolute -top-4 md:-top-5 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 bg-whatsapp-green rounded-full flex items-center justify-center border-4 border-white dark:border-[#1a1a1a] shadow-sm z-10 transition-transform group-hover:scale-110">
                  <Plus className="w-4 h-4 md:w-5 md:h-5 text-whatsapp-dark font-black" />
                </div>
                <span className="text-[10px] md:text-[11px] font-bold text-gray-900 dark:text-white mt-1">Criar história</span>
              </div>
           </div>
        )}
      </button>

      {/* Others - Rectangular */}
      {storyGroups.filter((g: any) => g.author_id !== currentUser?.id).map((group: any) => (
        <button
          key={group.author_id}
          onClick={() => onViewGroup(group)}
          className="relative w-28 md:w-32 h-44 md:h-52 rounded-xl overflow-hidden flex-shrink-0 group shadow-md border border-gray-200 dark:border-white/10 cursor-pointer hover:opacity-90 transition-all"
        >
          <div className="w-full h-full relative">
             <Avatar src={group.author_avatar} name={group.author_name} />
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 group-hover:bg-black/20 transition-colors" />
             
             {/* Small Avatar Indicator */}
             <div className={cn("absolute top-3 left-3 w-10 h-10 rounded-full border-2 overflow-hidden shadow-sm", group.allViewed ? "border-gray-300 dark:border-white/20" : "border-whatsapp-green")}>
               <Avatar src={group.author_avatar} name={group.author_name} />
             </div>

             {/* Live Indicator */}
             {group.is_live && (
               <div className="absolute top-14 left-3 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-lg">
                 AO VIVO
               </div>
             )}

             <span className="absolute bottom-3 left-3 right-3 text-white text-[10px] md:text-xs font-bold truncate text-left drop-shadow-md">
               {group.author_name?.split(' ')[0]}
             </span>
          </div>
        </button>
      ))}
    </div>
  );
}
