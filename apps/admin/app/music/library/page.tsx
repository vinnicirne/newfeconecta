'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Clock, ListMusic, Users, PlayCircle, Loader2, Sparkles } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import ReadySessions from '@/modules/femusic/presentation/components/ReadySessions';
import { READY_SESSIONS } from '@/modules/femusic/domain/sessions';

type TabId = 'history' | 'likes' | 'playlists' | 'shared';

export default function LibraryPage() {
  const [historyTracks, setHistoryTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('playlists');
  
  const { play, likedTracks, toggleLike, loadLikes } = usePlayerStore();

  useEffect(() => {
    loadLikes();
    setLoading(true);
    if (typeof window !== 'undefined') {
      try {
        const historyStr = localStorage.getItem('fc_music_history');
        if (historyStr) {
          const parsed = JSON.parse(historyStr);
          const validHistory = parsed.filter((t: any) => t && t.title && t.title.trim() !== '');
          setHistoryTracks(validHistory);
        }
      } catch (e) {
        console.error("Falha ao ler histórico", e);
      }
    }
    setLoading(false);
  }, [loadLikes]);

  const menuItems = [
    { id: 'playlists', icon: ListMusic, label: 'Sessões & Playlists', count: `${READY_SESSIONS.length}`, color: 'text-whatsapp-teal', bg: 'bg-whatsapp-teal/10' },
    { id: 'likes', icon: Heart, label: 'Músicas Curtidas', count: likedTracks.length.toString(), color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'history', icon: Clock, label: 'Histórico', count: historyTracks.length.toString(), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'shared', icon: Users, label: 'Recomendados', count: 'FéConecta', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const getDisplayData = () => {
    switch (activeTab) {
      case 'likes': return { title: 'Músicas Curtidas', icon: Heart, list: likedTracks };
      case 'history': return { title: 'Tocadas Recentemente', icon: Clock, list: historyTracks.slice(0, 20) };
      case 'playlists': return { title: 'Sessões de Oração & Louvor', icon: ListMusic, list: [] };
      default: return { title: 'Recomendações Especiais', icon: Sparkles, list: [] };
    }
  };

  const { title, icon: TitleIcon, list } = getDisplayData();

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="font-black text-2xl leading-tight mb-6">Sua Biblioteca</h1>

      {/* Menu Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id as TabId)}
              className={`bg-white dark:bg-[#1a1b1e] border rounded-2xl p-4 flex flex-col items-start gap-3 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all text-left
                ${isActive ? 'border-whatsapp-teal/50 ring-1 ring-whatsapp-teal/50' : 'border-gray-100 dark:border-white/5'}
              `}
            >
              <div className={`p-2 rounded-xl ${item.bg}`}>
                <Icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-sm">{item.label}</h3>
                <p className="text-xs text-gray-500 font-medium">{item.count} itens</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conteúdo Dinâmico por Aba */}
      <div>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <TitleIcon className={`w-5 h-5 ${activeTab === 'likes' ? 'text-red-500' : 'text-whatsapp-teal'}`} />
          {title}
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-whatsapp-teal" />
          </div>
        ) : activeTab === 'playlists' || activeTab === 'shared' ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">
              Escolha uma sessão pronta para iniciar um momento contínuo de oração e louvor:
            </p>
            <ReadySessions />
          </div>
        ) : list.length > 0 ? (
          <div className="flex flex-col gap-3">
            {list.map((track, i) => (
              <div 
                key={track.id || i} 
                onClick={() => play(track, list)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                  {track.cover ? (
                    <img src={track.cover} className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic className="w-6 h-6 text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{track.title || 'Faixa Desconhecida'}</h4>
                  <p className="text-xs text-gray-500 truncate">{track.artist || 'Artista Desconhecido'}</p>
                </div>
                <button 
                  className="p-2 transition-transform active:scale-90"
                  onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                >
                  <Heart className={
                    likedTracks.some(t => (t.providerTrackId || t.id) === (track.providerTrackId || track.id)) 
                      ? "w-5 h-5 text-red-500 fill-red-500 transition-colors" 
                      : "w-5 h-5 text-gray-400 hover:text-red-500 transition-colors"
                  } />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a1b1e] border border-gray-100 dark:border-white/5 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-whatsapp-teal/10 text-whatsapp-teal flex items-center justify-center mx-auto">
              <TitleIcon className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
              {activeTab === 'likes' ? 'Nenhuma música favoritada ainda' : 'Seu histórico ainda está vazio'}
            </p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              {activeTab === 'likes' 
                ? 'Toque no ícone de coração durante a reprodução de qualquer louvor para salvar aqui.'
                : 'As músicas que você ouvir no FéMusic ficarão salvas automaticamente no seu histórico.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
