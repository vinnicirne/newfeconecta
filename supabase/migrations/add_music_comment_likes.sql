-- Tabela de curtidas por usuário nos comentários do FéMusic
CREATE TABLE IF NOT EXISTS public.music_track_comment_likes (
  comment_id UUID REFERENCES public.music_track_comments(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (comment_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.music_track_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id    ON public.music_track_comment_likes(user_id);

-- RLS
ALTER TABLE public.music_track_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_likes_select ON public.music_track_comment_likes;
CREATE POLICY comment_likes_select ON public.music_track_comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS comment_likes_insert ON public.music_track_comment_likes;
CREATE POLICY comment_likes_insert ON public.music_track_comment_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS comment_likes_delete ON public.music_track_comment_likes;
CREATE POLICY comment_likes_delete ON public.music_track_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- GRANTs
GRANT SELECT ON public.music_track_comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.music_track_comment_likes TO authenticated;
