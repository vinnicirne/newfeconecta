"use client";

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StoriesBar({ storyGroups, myStoryGroup, currentUser, onAddStory, onViewGroup }: any) {

  const AvatarRing = ({ group, children }: any) => {
    const viewed = group?.allViewed;
    return (
      <div
        className={cn(
          "w-[72px] h-[72px] rounded-[28px] flex items-center justify-center p-[2.5px] transition-all active:scale-95 shadow-sm",
          viewed 
            ? "bg-gray-200 dark:bg-white/10" 
            : "bg-gradient-to-tr from-whatsapp-green via-whatsapp-teal to-whatsapp-green"
        )}
      >
        <div className="w-full h-full rounded-[26px] bg-white dark:bg-whatsapp-dark p-[2px]">
          <div className="w-full h-full rounded-[24px] overflow-hidden bg-muted">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const Avatar = ({ src, name }: any) => src
    ? <img src={src} className="w-full h-full object-cover" alt={name} />
    : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white font-bold text-lg">
        {(name || '?')[0].toUpperCase()}
      </div>;

  return (
    <div className="flex gap-4 px-4 py-4 overflow-x-auto no-scrollbar scroll-smooth" style={{ scrollbarWidth: 'none' }}>

      {/* My Story */}
      <button
        onClick={myStoryGroup ? () => onViewGroup(myStoryGroup) : onAddStory}
        className="flex flex-col items-center gap-2 flex-shrink-0"
      >
        <div className="relative">
          {myStoryGroup ? (
            <AvatarRing group={myStoryGroup}>
              <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
            </AvatarRing>
          ) : (
            <div className="w-[72px] h-[72px] rounded-[28px] overflow-hidden bg-gray-50 dark:bg-whatsapp-dark border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center transition-all hover:border-whatsapp-green group">
              <div className="w-full h-full p-2">
                <div className="w-full h-full rounded-[20px] overflow-hidden transition-all group-hover:scale-105">
                  <Avatar src={currentUser?.avatar_url} name={currentUser?.full_name} />
                </div>
              </div>
            </div>
          )}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onAddStory();
            }}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-xl bg-whatsapp-green flex items-center justify-center border-4 border-white dark:border-whatsapp-dark shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
          >
            <Plus className="w-3 h-3 text-whatsapp-dark font-bold" />
          </div>
        </div>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest w-16 text-center truncate leading-tight">
          {myStoryGroup ? 'Meu status' : 'Adicionar'}
        </span>
      </button>

      {/* Others (Filtrando o Usuário Atual para evitar duplicidade) */}
      {storyGroups.filter((g: any) => g.author_id !== currentUser?.id).map((group: any) => (
        <button
          key={group.author_id}
          onClick={() => onViewGroup(group)}
          className="flex flex-col items-center gap-2 flex-shrink-0"
        >
          <AvatarRing group={group}>
            <Avatar src={group.author_avatar} name={group.author_name} />
          </AvatarRing>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest w-16 text-center truncate leading-tight">
            {group.author_name?.split(' ')[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
