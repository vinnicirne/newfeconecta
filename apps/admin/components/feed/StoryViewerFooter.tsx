import React from 'react';
import { Share2, Eye, ChevronUp, Star, Send, Flame } from 'lucide-react';
import { useStoryViewer } from './StoryViewerContext';
import { cn } from '@/lib/utils';

export default function StoryViewerFooter() {
  const {
    data: { story, group, currentUser },
    ui: { comment, isLiked, floatingEmojis },
    actions: { 
      dispatch, openStats, handleHighlightToggle, sendEmojiReaction, 
      handleSendComment, handleLike 
    }
  } = useStoryViewer();

  if (!group || !story) return null;

  return (
    <>
      {(story as any).mentions?.includes((currentUser as any)?.username) && (
        <div className="absolute bottom-24 left-0 right-0 z-30 px-6 flex justify-center">
           <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-bold animate-bounce">
              <Share2 className="w-3.5 h-3.5" />
              ADICIONAR AO MEU STATUS
           </button>
        </div>
      )}

      {floatingEmojis.map((emoji: any) => (
        <div 
          key={emoji.id}
          className="absolute bottom-20 z-[100] text-4xl animate-float-up pointer-events-none"
          style={{ left: `${emoji.left}%` }}
        >
          {emoji.char}
        </div>
      ))}

      <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pointer-events-none">
        {currentUser && story.author_id === currentUser.id ? (
          <div className="w-full flex justify-between items-end px-6 pb-20 pointer-events-auto">
            <button 
              onClick={openStats}
              className="flex flex-col items-center gap-1 group/stats"
            >
              <div className="flex items-center gap-2 text-white bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-bold">Visto por</span>
                <ChevronUp className="w-3 h-3 ml-1 group-hover/stats:-translate-y-1 transition-transform" />
              </div>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleHighlightToggle(); }}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-75",
                story.is_highlight ? "bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "bg-white/10 text-white border border-white/10 hover:bg-white/20"
              )}
            >
              <Star className={cn("w-6 h-6", story.is_highlight && "fill-current")} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-4 transition-all animate-bounce opacity-70 group-hover:opacity-100">
               <ChevronUp className="text-white w-5 h-5 mb-1" />
               <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Responder</span>
            </div>

            <div className="flex items-center justify-between w-full px-8 mb-4 max-w-sm pointer-events-auto">
               {['🔥', '❤️', '🙌', '😂', '😮', '😢', '👏', '🎉'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); sendEmojiReaction(emoji); }}
                    className="text-2xl hover:scale-125 transition-transform active:scale-90"
                  >
                    {emoji}
                  </button>
               ))}
            </div>

            <div className="w-full p-4 pb-20 flex items-center gap-3 pointer-events-auto">
               <form onSubmit={handleSendComment} className="flex-1 relative">
                  <input 
                    id="story-comment-input"
                    type="text" 
                    placeholder="Enviar mensagem..."
                    value={comment}
                    onChange={(e) => dispatch({ type: "SET_COMMENT", payload: e.target.value })}
                    onFocus={() => dispatch({ type: "SET_PAUSED", payload: true })}
                    onBlur={() => dispatch({ type: "SET_PAUSED", payload: false })}
                    className="w-full bg-white/10 border border-white/10 rounded-full py-2.5 px-5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all shadow-inner"
                  />
                  {comment.trim() && (
                      <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-whatsapp-green flex items-center justify-center text-whatsapp-dark">
                        <Send className="w-4 h-4" />
                      </button>
                  )}
               </form>
               <button 
                  onClick={(e) => { e.stopPropagation(); handleLike(); }}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-75",
                    isLiked ? "bg-whatsapp-green text-whatsapp-dark" : "bg-white/10 text-white border border-white/10"
                  )}
               >
                  <Flame className={cn("w-6 h-6", isLiked && "fill-current")} />
               </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
