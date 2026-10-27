import React from 'react';
import { X, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useStoryViewer } from './StoryViewerContext';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

function formatTime(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return date.toLocaleDateString('pt-BR');
}

export default function StoryViewerHeader() {
  const {
    data: { group, story, currentUser, onClose },
    ui: { storyIdx, progress, isMuted },
    actions: { handleDelete, dispatch, videoRef }
  } = useStoryViewer();
  const router = useRouter();

  if (!group || !story) return null;

  return (
    <>
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-0 right-0 z-20 px-2 flex gap-1">
        {group.stories.map((_: any, i: number) => (
          <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-75",
                i < storyIdx ? "w-full bg-white" : i === storyIdx ? "bg-white" : "w-0"
              )}
              style={{ width: i === storyIdx ? `${progress}%` : undefined }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))] left-0 right-0 z-20 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-whatsapp-green bg-whatsapp-teal">
              {group.author_avatar && <img src={group.author_avatar} className="w-full h-full object-cover" alt="" />}
           </div>
            <div>
              <p className="text-white text-sm font-bold leading-none mb-1">{group.author_name}</p>
              <div className="flex items-center gap-2">
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest leading-none">
                  {story.created_at ? formatTime(new Date(story.created_at)) : 'Agora'}
                </p>
                {group.is_live && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/room/${(group as any).room_id}`);
                    }}
                    className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md animate-pulse border border-white/20 whitespace-nowrap"
                  >
                    AO VIVO
                  </button>
                )}
              </div>
            </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
          {story.media_type === "video" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = !isMuted;
                dispatch({ type: "SET_MUTED", payload: next });
                if (videoRef?.current) {
                  videoRef.current.muted = next;
                  if (!next) {
                    videoRef.current.play().catch(console.error);
                  }
                }
              }}
              className="p-2 text-white/80 hover:text-white transition-all rounded-full hover:bg-white/10 active:scale-95"
              title={isMuted ? "Ativar áudio" : "Silenciar áudio"}
            >
              {isMuted ? <VolumeX size={20} className="text-amber-400" /> : <Volume2 size={20} />}
            </button>
          )}
          {currentUser && story.author_id === currentUser.id && (
             <button 
               onClick={(e) => { e.stopPropagation(); handleDelete(); }}
               className="p-2 text-white/50 hover:text-red-500 transition-all rounded-full hover:bg-white/10"
               title="Excluir Status"
             >
               <Trash2 size={20} />
             </button>
          )}
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-all rounded-full hover:bg-white/10">
            <X size={24} />
          </button>
        </div>
      </div>
    </>
  );
}
