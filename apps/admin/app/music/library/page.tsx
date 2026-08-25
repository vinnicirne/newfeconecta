'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Clock, ListMusic, Users, PlayCircle, Loader2, Sparkles, Plus, Play, ChevronRight, ListPlus, Share2 } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { usePlaylistStore } from '@/modules/femusic/infrastructure/state/usePlaylistStore';
import { MusicPlaylist } from '@/modules/femusic/domain/entities/MusicPlaylist';
import { MusicTrack } from '@/modules/femusic/domain/entities/MusicTrack';
import ReadySessions from '@/modules/femusic/presentation/components/ReadySessions';
import CreatePlaylistModal from '@/modules/femusic/presentation/components/CreatePlaylistModal';
import PlaylistViewModal from '@/modules/femusic/presentation/components/PlaylistViewModal';
import AddToPlaylistModal from '@/modules/femusic/presentation/components/AddToPlaylistModal';
import SharePlaylistModal from '@/modules/femusic/presentation/components/SharePlaylistModal';
import { READY_SESSIONS } from '@/modules/femusic/domain/sessions';
import { Button } from '@/components/ui/button';

type TabId = 'playlists' | 'likes' | 'history' | 'shared';

export default function LibraryPage() {
  const [historyTracks, setHistoryTracks] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('playlists');
  
  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<MusicPlaylist | null>(null);
  const [sharingPlaylist, setSharingPlaylist] = useState<MusicPlaylist | null>(null);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<MusicTrack | null>(null);

  const { play, likedTracks, toggleLike, loadLikes } = usePlayerStore();
  const { playlists, loadPlaylists, loading: loadingPlaylists } = usePlaylistStore();

  useEffect(() => {
    loadLikes();
    loadPlaylists();
    
    setLoadingHistory(true);
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
    setLoadingHistory(false);
  }, [loadLikes, loadPlaylists]);

  const totalPlaylistItems = playlists.length + READY_SESSIONS.length;

  const menuItems = [
    { id: 'playlists', icon: ListMusic, label: 'Sessões & Playlists', count: `${totalPlaylistItems}`, color: 'text-whatsapp-teal', bg: 'bg-whatsapp-teal/10' },
    { id: 'likes', icon: Heart, label: 'Músicas Curtidas', count: likedTracks.length.toString(), color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'history', icon: Clock, label: 'Histórico', count: historyTracks.length.toString(), color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'shared', icon: Users, label: 'Recomendados', count: 'FéConecta', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const getDisplayData = () => {
    switch (activeTab) {
      case 'likes': return { title: 'Músicas Curtidas', icon: Heart, list: likedTracks };
      case 'history': return { title: 'Tocadas Recentemente', icon: Clock, list: historyTracks.slice(0, 20) };
      case 'playlists': return { title: 'Playlists & Sessões', icon: ListMusic, list: [] };
      default: return { title: 'Recomendações Especiais', icon: Sparkles, list: [] };
    }
  };

  const { title, icon: TitleIcon, list } = getDisplayData();

  return (
    <div className="px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-black text-2xl leading-tight">Sua Biblioteca</h1>
        {activeTab === 'playlists' && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold rounded-2xl px-4 py-2 text-xs flex items-center gap-1.5 shadow-md shadow-whatsapp-teal/20"
          >
            <Plus className="w-4 h-4" />
            Nova Playlist
          </Button>
        )}
      </div>

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <TitleIcon className={`w-5 h-5 ${activeTab === 'likes' ? 'text-red-500' : 'text-whatsapp-teal'}`} />
            {title}
          </h2>
        </div>
        
        {loadingHistory || (activeTab === 'playlists' && loadingPlaylists) ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-whatsapp-teal" />
          </div>
        ) : activeTab === 'playlists' ? (
          <div className="space-y-8">
            {/* Seção 1: Minhas Playlists Criadas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Minhas Playlists</h3>
                <span className="text-xs text-gray-400">{playlists.length} criadas</span>
              </div>

              {playlists.length === 0 ? (
                <div 
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-white dark:bg-[#1a1b1e] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-whatsapp-teal/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-whatsapp-teal/10 text-whatsapp-teal flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200">Crie sua primeira Playlist</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Junte seus louvores prediletos para orar e adorar quando quiser.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => setSelectedPlaylist(pl)}
                      className="bg-white dark:bg-[#1a1b1e] border border-gray-100 dark:border-white/5 rounded-2xl p-3.5 flex flex-col gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm group relative"
                    >
                      <div className="w-full aspect-square rounded-xl bg-whatsapp-teal/10 overflow-hidden flex items-center justify-center relative shadow-inner">
                        {pl.coverUrl ? (
                          <img src={pl.coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic className="w-10 h-10 text-whatsapp-teal/60" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle className="w-8 h-8 text-white" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingPlaylist(pl);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-whatsapp-teal transition-all shadow-md active:scale-90 opacity-90 hover:opacity-100"
                          title="Compartilhar Playlist no Feed"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate group-hover:text-whatsapp-teal transition-colors">
                          {pl.title}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {pl.trackCount} {pl.trackCount === 1 ? 'louvor' : 'louvores'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seção 2: Sessões Prontas de Oração */}
            <div className="pt-2 border-t border-gray-100 dark:border-white/5">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Sessões Prontas de Oração & Louvor</h3>
                <p className="text-xs text-gray-500">Curadoria contínua pronta para tocar sem interrupções:</p>
              </div>
              <ReadySessions />
            </div>
          </div>
        ) : activeTab === 'shared' ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">
              Sessões recomendadas pela comunidade FéConecta:
            </p>
            <ReadySessions />
          </div>
        ) : list.length > 0 ? (
          <div className="flex flex-col gap-3">
            {list.map((track, i) => {
              const trackId = track.providerTrackId || track.id;
              const isLiked = likedTracks.some(t => (t.providerTrackId || t.id) === trackId);
              return (
                <div 
                  key={track.id || i} 
                  onClick={() => play(track, list)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
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
                      <h4 className="font-bold text-sm truncate group-hover:text-whatsapp-teal transition-colors">{track.title || 'Faixa Desconhecida'}</h4>
                      <p className="text-xs text-gray-500 truncate">{track.artist || 'Artista Desconhecido'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="p-2 transition-transform active:scale-90"
                      onClick={() => toggleLike(track)}
                      title="Curtir"
                    >
                      <Heart className={
                        isLiked 
                          ? "w-5 h-5 text-red-500 fill-red-500 transition-colors" 
                          : "w-5 h-5 text-gray-400 hover:text-red-500 transition-colors"
                      } />
                    </button>
                    <button
                      className="p-2 transition-transform active:scale-90 text-gray-400 hover:text-whatsapp-teal"
                      onClick={() => setSelectedTrackForPlaylist(track)}
                      title="Adicionar à Playlist"
                    >
                      <ListPlus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
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

      {/* Modais */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(id) => {
          const created = playlists.find(p => p.id === id);
          if (created) setSelectedPlaylist(created);
        }}
      />

      <PlaylistViewModal
        isOpen={!!selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
        playlist={selectedPlaylist}
      />

      <AddToPlaylistModal
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
        track={selectedTrackForPlaylist}
      />

      <SharePlaylistModal
        isOpen={!!sharingPlaylist}
        onClose={() => setSharingPlaylist(null)}
        playlist={sharingPlaylist}
        tracks={sharingPlaylist?.tracks || []}
      />
    </div>
  );
}
