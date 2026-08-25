-- =========================================================================
-- MIGRAÇÃO: TABELAS E POLÍTICAS RLS DE PLAYLISTS NO FÉMUSIC
-- Data: 2026-08-25
-- =========================================================================

-- 1. Tabela de Playlists do Usuário
CREATE TABLE IF NOT EXISTS public.music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Faixas das Playlists
CREATE TABLE IF NOT EXISTS public.music_playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.music_playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_data JSONB NOT NULL,
  position INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_playlist_track UNIQUE(playlist_id, track_id)
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_music_playlists_user_id ON public.music_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_music_playlist_tracks_playlist_id ON public.music_playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_music_playlist_tracks_position ON public.music_playlist_tracks(playlist_id, position);

-- Habilita RLS
ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Limpa políticas antigas se existirem
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_playlists' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_playlists', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_playlist_tracks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_playlist_tracks', pol.policyname);
  END LOOP;
END $$;

-- Políticas para music_playlists
CREATE POLICY "music_playlists_select_policy" ON public.music_playlists 
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "music_playlists_insert_policy" ON public.music_playlists 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_playlists_update_policy" ON public.music_playlists 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_playlists_delete_policy" ON public.music_playlists 
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para music_playlist_tracks
CREATE POLICY "music_playlist_tracks_select_policy" ON public.music_playlist_tracks 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.music_playlists 
      WHERE id = playlist_id AND (is_public = true OR user_id = auth.uid())
    )
  );

CREATE POLICY "music_playlist_tracks_insert_policy" ON public.music_playlist_tracks 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.music_playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "music_playlist_tracks_update_policy" ON public.music_playlist_tracks 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.music_playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.music_playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "music_playlist_tracks_delete_policy" ON public.music_playlist_tracks 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.music_playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );

-- Permissões
GRANT ALL ON TABLE public.music_playlists TO authenticated, service_role;
GRANT SELECT ON TABLE public.music_playlists TO anon;

GRANT ALL ON TABLE public.music_playlist_tracks TO authenticated, service_role;
GRANT SELECT ON TABLE public.music_playlist_tracks TO anon;
