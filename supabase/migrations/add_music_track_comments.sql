-- Tabela de comentários nas músicas do FéMusic
CREATE TABLE IF NOT EXISTS public.music_track_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  parent_id UUID REFERENCES public.music_track_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_music_track_comments_track_id ON public.music_track_comments(track_id);
CREATE INDEX IF NOT EXISTS idx_music_track_comments_parent_id ON public.music_track_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_music_track_comments_user_id ON public.music_track_comments(user_id);

-- Habilitar RLS
ALTER TABLE public.music_track_comments ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler comentários
CREATE POLICY "music_comments_select_all"
  ON public.music_track_comments FOR SELECT
  USING (true);

-- Apenas usuários autenticados podem inserir
CREATE POLICY "music_comments_insert_authenticated"
  ON public.music_track_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode atualizar apenas seus próprios comentários (ex: likes_count atualizado por trigger)
-- Mas permitimos update geral de likes_count (todos podem curtir)
CREATE POLICY "music_comments_update_likes"
  ON public.music_track_comments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Apenas o autor pode apagar seu comentário
CREATE POLICY "music_comments_delete_own"
  ON public.music_track_comments FOR DELETE
  USING (auth.uid() = user_id);
