import React from 'react';
import { Camera } from 'lucide-react';
import { useStoryViewer } from './StoryViewerContext';

export default function StoryViewerHighlightModal() {
  const {
    ui: { isNamingStory, highlightCover, highlightTitle },
    actions: { confirmHighlight, dispatch }
  } = useStoryViewer();

  if (!isNamingStory) return null;

  return (
    <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300 pointer-events-auto">
      <div className="w-full max-w-xs bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-6 shadow-2xl">
         <h3 className="text-white text-lg font-bold mb-4 text-center">Configurar Destaque</h3>
         
         <div className="flex justify-center mb-6">
           <div className="relative group">
             <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-400 to-yellow-200">
               <div className="w-full h-full rounded-full bg-gray-900 border-2 border-black overflow-hidden flex items-center justify-center">
                 {highlightCover ? (
                   <img src={highlightCover} className="w-full h-full object-cover" alt="" />
                 ) : (
                   <Camera className="w-8 h-8 text-white/40" />
                 )}
               </div>
             </div>
             <label className="absolute bottom-0 right-0 w-8 h-8 bg-amber-400 rounded-full border-2 border-black flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg">
               <Camera className="w-4 h-4 text-black" />
               <input 
                 type="file" 
                 className="hidden" 
                 accept="image/*"
                 onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     dispatch({ type: "SET_COVER_FILE", payload: file });
                     dispatch({ type: "SET_HIGHLIGHT_COVER", payload: URL.createObjectURL(file) });
                   }
                 }}
               />
             </label>
           </div>
         </div>

         <input 
           autoFocus
           type="text"
           value={highlightTitle}
           onChange={(e) => dispatch({ type: "SET_HIGHLIGHT_TITLE", payload: e.target.value })}
           onKeyDown={(e) => e.key === 'Enter' && confirmHighlight()}
           placeholder="Ex: Viagem, Fé..."
           className="w-full bg-white/10 border border-white/10 rounded-2xl py-3 px-4 text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all mb-4"
         />
         <div className="flex gap-2">
            <button 
              onClick={() => { dispatch({ type: "SET_NAMING", payload: false }); dispatch({ type: "SET_PAUSED", payload: false }); }}
              className="flex-1 py-3 rounded-2xl bg-white/5 text-white/70 font-bold hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmHighlight}
              className="flex-1 py-3 rounded-2xl bg-amber-400 text-black font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              Salvar
            </button>
         </div>
      </div>
    </div>
  );
}
