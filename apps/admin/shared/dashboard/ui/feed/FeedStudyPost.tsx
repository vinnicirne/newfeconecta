import React, { useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { BookOpen, MoreHorizontal, Heart, MessageSquare } from 'lucide-react';

export function FeedStudyPost({ item, onDelete }: any) {
  const [isLiked, setIsLiked] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const study = item.content;

  return (
    <div className={`bg-white dark:bg-[#111B21] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm mb-6 relative ${isMenuOpen ? 'z-50' : 'z-0'}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white leading-tight">Estudo disponibilizado</div>
            <div className="text-xs text-gray-500">{moment(item.created_at).fromNow()}</div>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <MoreHorizontal size={20} />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
              <div className="absolute right-0 top-10 mt-1 w-48 bg-white dark:bg-[#1A2429] rounded-xl shadow-lg border border-black/10 dark:border-white/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    toast.info('Edição de estudos em breve!');
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Editar
                </button>
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 border border-black/5 dark:border-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/40 transition-colors">
          <h4 className="font-bold text-gray-900 dark:text-white text-lg">{study.title}</h4>
          <p className="text-sm text-gray-500 mt-1">{study.reference}</p>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 flex items-center gap-6">
        <button 
          onClick={() => setIsLiked(!isLiked)} 
          className={`flex items-center gap-2 text-sm font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Heart size={18} className={isLiked ? "fill-current" : ""} /> {isLiked ? 'Curtido' : 'Curtir'}
        </button>
        <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <MessageSquare size={18} /> Comentar
        </button>
      </div>
    </div>
  );
}
