import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { MusicPlaylist } from '../../domain/entities/MusicPlaylist';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { toast } from 'sonner';

interface PlaylistState {
  playlists: MusicPlaylist[];
  loading: boolean;
  activePlaylist: MusicPlaylist | null;
  activePlaylistTracks: MusicTrack[];
  loadingTracks: boolean;

  // Ações
  loadPlaylists: () => Promise<void>;
  createPlaylist: (title: string, description?: string) => Promise<MusicPlaylist | null>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  addTrackToPlaylist: (playlistId: string, track: MusicTrack) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  loadPlaylistTracks: (playlistId: string) => Promise<MusicTrack[]>;
  setActivePlaylist: (playlist: MusicPlaylist | null) => void;
}

const STORAGE_KEY = 'fc_user_playlists';

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  loading: false,
  activePlaylist: null,
  activePlaylistTracks: [],
  loadingTracks: false,

  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),

  loadPlaylists: async () => {
    // 1. Carregamento instantâneo do cache local
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            set({ playlists: parsed });
          }
        }
      } catch (e) {
        console.warn('[PlaylistStore] Erro ao carregar cache local:', e);
      }
    }

    set({ loading: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      // Busca playlists do usuário e conta as faixas de cada uma
      const { data, error } = await supabase
        .from('music_playlists')
        .select(`
          id,
          user_id,
          title,
          description,
          cover_url,
          is_public,
          created_at,
          updated_at,
          music_playlist_tracks (
            id,
            track_data
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[PlaylistStore] Erro ao buscar playlists do Supabase:', error);
        set({ loading: false });
        return;
      }

      if (data) {
        const formattedPlaylists: MusicPlaylist[] = data.map((p: any) => {
          const tracks = (p.music_playlist_tracks || []).map((t: any) => t.track_data).filter(Boolean);
          // Usa a capa da primeira faixa como capa padrão se cover_url estiver vazio
          const cover = p.cover_url || tracks[0]?.cover || null;
          return {
            id: p.id,
            userId: p.user_id,
            title: p.title,
            description: p.description,
            coverUrl: cover,
            trackCount: tracks.length,
            tracks: tracks,
            isPublic: p.is_public ?? true,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          };
        });

        set({ playlists: formattedPlaylists, loading: false });
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedPlaylists));
        }
      }
    } catch (err) {
      console.error('[PlaylistStore] Erro geral:', err);
      set({ loading: false });
    }
  },

  createPlaylist: async (title: string, description?: string) => {
    if (!title.trim()) {
      toast.error('O título da playlist não pode ser vazio');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para criar uma playlist');
        return null;
      }

      const newPlaylistRow = {
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        is_public: true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('music_playlists')
        .insert([newPlaylistRow])
        .select()
        .single();

      if (error) {
        toast.error('Erro ao criar playlist: ' + error.message);
        return null;
      }

      const newPlaylist: MusicPlaylist = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        coverUrl: data.cover_url,
        trackCount: 0,
        tracks: [],
        isPublic: data.is_public ?? true,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      const updated = [newPlaylist, ...get().playlists];
      set({ playlists: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      toast.success(`Playlist "${title}" criada com sucesso! 🎵`);
      return newPlaylist;
    } catch (err: any) {
      console.error('[PlaylistStore] Erro ao criar:', err);
      toast.error('Erro ao criar playlist: ' + err.message);
      return null;
    }
  },

  deletePlaylist: async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('music_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) {
        toast.error('Erro ao deletar playlist: ' + error.message);
        return false;
      }

      const updated = get().playlists.filter((p) => p.id !== playlistId);
      set({ 
        playlists: updated, 
        activePlaylist: get().activePlaylist?.id === playlistId ? null : get().activePlaylist 
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      toast.success('Playlist excluída com sucesso.');
      return true;
    } catch (err: any) {
      console.error('[PlaylistStore] Erro ao deletar:', err);
      toast.error('Falha ao excluir playlist');
      return false;
    }
  },

  addTrackToPlaylist: async (playlistId: string, track: MusicTrack) => {
    const trackId = track.providerTrackId || track.id;
    if (!trackId) return false;

    try {
      const { error } = await supabase
        .from('music_playlist_tracks')
        .upsert([
          {
            playlist_id: playlistId,
            track_id: trackId,
            track_data: track,
            position: 999, // Adiciona ao final
            added_at: new Date().toISOString()
          }
        ], { onConflict: 'playlist_id,track_id' });

      if (error) {
        toast.error('Erro ao adicionar à playlist: ' + error.message);
        return false;
      }

      // Atualiza timestamp da playlist
      await supabase
        .from('music_playlists')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', playlistId);

      // Atualiza o estado local imediatamente
      const updatedPlaylists = get().playlists.map((p) => {
        if (p.id === playlistId) {
          const currentTracks = p.tracks || [];
          const exists = currentTracks.some((t) => (t.providerTrackId || t.id) === trackId);
          const newTracks = exists ? currentTracks : [...currentTracks, track];
          return {
            ...p,
            trackCount: newTracks.length,
            coverUrl: p.coverUrl || track.cover || undefined,
            tracks: newTracks,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });

      set({ playlists: updatedPlaylists });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlaylists));
      }

      const targetPlaylist = updatedPlaylists.find((p) => p.id === playlistId);
      toast.success(`"${track.title}" adicionada à playlist ${targetPlaylist?.title ? `"${targetPlaylist.title}"` : ''}! 🙌`);
      return true;
    } catch (err: any) {
      console.error('[PlaylistStore] Erro ao adicionar faixa:', err);
      toast.error('Falha ao adicionar à playlist');
      return false;
    }
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    try {
      const { error } = await supabase
        .from('music_playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);

      if (error) {
        toast.error('Erro ao remover faixa: ' + error.message);
        return false;
      }

      // Atualiza estado local de tracks
      const updatedTracks = get().activePlaylistTracks.filter(
        (t) => (t.providerTrackId || t.id) !== trackId
      );
      set({ activePlaylistTracks: updatedTracks });

      // Atualiza estado local da lista de playlists
      const updatedPlaylists = get().playlists.map((p) => {
        if (p.id === playlistId) {
          const newTracks = (p.tracks || []).filter((t) => (t.providerTrackId || t.id) !== trackId);
          return {
            ...p,
            trackCount: newTracks.length,
            tracks: newTracks
          };
        }
        return p;
      });

      set({ playlists: updatedPlaylists });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlaylists));
      }

      toast.success('Faixa removida da playlist.');
      return true;
    } catch (err: any) {
      console.error('[PlaylistStore] Erro ao remover faixa:', err);
      toast.error('Falha ao remover faixa da playlist');
      return false;
    }
  },

  loadPlaylistTracks: async (playlistId: string) => {
    set({ loadingTracks: true });
    try {
      const { data, error } = await supabase
        .from('music_playlist_tracks')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true })
        .order('added_at', { ascending: true });

      if (error) {
        console.error('[PlaylistStore] Erro ao carregar faixas:', error);
        set({ loadingTracks: false });
        return [];
      }

      const tracks: MusicTrack[] = (data || []).map((row: any) => row.track_data).filter(Boolean);
      set({ activePlaylistTracks: tracks, loadingTracks: false });
      return tracks;
    } catch (err) {
      console.error('[PlaylistStore] Erro ao carregar faixas da playlist:', err);
      set({ loadingTracks: false });
      return [];
    }
  }
}));
