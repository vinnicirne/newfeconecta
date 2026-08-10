import React from 'react';
import { X, Eye, Flame } from 'lucide-react';
import { useStoryViewer } from './StoryViewerContext';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function StoryViewerStats() {
  const {
    ui: { showStats, statsTab, statsData, isLoadingStats },
    actions: { dispatch }
  } = useStoryViewer();
  const router = useRouter();

  if (!showStats) return null;

  return (
    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col pointer-events-auto animate-in fade-in slide-in-from-bottom-10 duration-300">
       <div className="flex flex-col border-b border-white/10">
         <div className="flex items-center justify-between p-6 pb-4">
           <h3 className="text-white font-bold text-xl flex items-center gap-2">
              <Eye className="w-5 h-5 text-whatsapp-green" />
              Interações
           </h3>
           <button onClick={() => { dispatch({ type: "SET_SHOW_STATS", payload: false }); dispatch({ type: "SET_PAUSED", payload: false }); }} className="p-2 bg-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all">
             <X size={20} />
           </button>
         </div>
         <div className="flex px-6 gap-6">
            <button 
              onClick={() => dispatch({ type: "SET_STATS_TAB", payload: 'views' })}
              className={`pb-3 font-bold text-sm transition-colors relative ${statsTab === 'views' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              Visualizações ({statsData.views.length})
              {statsTab === 'views' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-whatsapp-green rounded-t-full" />}
            </button>
            <button 
              onClick={() => dispatch({ type: "SET_STATS_TAB", payload: 'likes' })}
              className={`pb-3 font-bold text-sm transition-colors relative ${statsTab === 'likes' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              Curtidas ({statsData.likes.length})
              {statsTab === 'likes' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-whatsapp-green rounded-t-full" />}
            </button>
         </div>
       </div>
       
       <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoadingStats ? (
             <div className="flex flex-col items-center justify-center h-full text-white/50">
                <div className="w-10 h-10 rounded-full border-4 border-whatsapp-green border-t-transparent animate-spin mb-4" />
                <p className="font-bold">Carregando interações...</p>
             </div>
          ) : statsData[statsTab].length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-white/50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                   {statsTab === 'views' ? <Eye size={32} className="opacity-40" /> : <Flame size={32} className="opacity-40" />}
                </div>
                <p className="font-bold">Nenhuma {statsTab === 'views' ? 'visualização' : 'curtida'} ainda</p>
                <p className="text-xs mt-1 text-center max-w-[200px]">
                   Quando seus amigos {statsTab === 'views' ? 'virem' : 'curtirem'} este status, eles aparecerão aqui.
                </p>
             </div>
          ) : (
             <div className="space-y-4 pb-20">
                {statsData[statsTab].map((user: any) => (
                   <div key={user.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                     <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10">
                        {user.avatar_url ? (
                           <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-lg">
                              {user.full_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                           </div>
                        )}
                     </div>
                     <div className="min-w-0">
                        <p className="text-white font-bold truncate text-sm">{user.full_name || user.username}</p>
                        <p className="text-white/50 text-xs truncate">@{user.username}</p>
                     </div>
                     {statsTab === 'likes' && (
                        <Flame className="w-5 h-5 text-whatsapp-green ml-auto shrink-0" />
                     )}
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );
}
