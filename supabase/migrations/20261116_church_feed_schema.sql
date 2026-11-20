-- Complete the church feed schema used by /igreja/[slug].
ALTER TABLE public.church_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url TEXT;

UPDATE public.church_posts
SET post_type = CASE lower(COALESCE(type, 'text'))
  WHEN 'photo' THEN 'image'
  WHEN 'image' THEN 'image'
  WHEN 'video' THEN 'video'
  WHEN 'audio' THEN 'audio'
  ELSE 'text'
END;

CREATE INDEX IF NOT EXISTS idx_church_posts_church_created
  ON public.church_posts(church_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.church_post_likes (
  post_id UUID NOT NULL REFERENCES public.church_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.church_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.church_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.church_post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_church_post_likes_user_post
  ON public.church_post_likes(user_id, post_id);

CREATE INDEX IF NOT EXISTS idx_church_post_comments_post_created
  ON public.church_post_comments(post_id, created_at);

ALTER TABLE public.church_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_post_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.church_post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.church_post_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.church_posts TO authenticated;

DROP POLICY IF EXISTS church_post_likes_select_members ON public.church_post_likes;
CREATE POLICY church_post_likes_select_members ON public.church_post_likes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.church_posts p
    JOIN public.church_members cm ON cm.church_id = p.church_id
    WHERE p.id = church_post_likes.post_id
      AND cm.user_id = auth.uid()
      AND cm.approved = true
  ));

DROP POLICY IF EXISTS church_post_likes_insert_own ON public.church_post_likes;
CREATE POLICY church_post_likes_insert_own ON public.church_post_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.church_posts p
      JOIN public.church_members cm ON cm.church_id = p.church_id
      WHERE p.id = church_post_likes.post_id
        AND cm.user_id = auth.uid()
        AND cm.approved = true
    )
  );

DROP POLICY IF EXISTS church_post_likes_delete_own ON public.church_post_likes;
CREATE POLICY church_post_likes_delete_own ON public.church_post_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS church_post_comments_select_members ON public.church_post_comments;
CREATE POLICY church_post_comments_select_members ON public.church_post_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.church_posts p
    JOIN public.church_members cm ON cm.church_id = p.church_id
    WHERE p.id = church_post_comments.post_id
      AND cm.user_id = auth.uid()
      AND cm.approved = true
  ));

DROP POLICY IF EXISTS church_post_comments_insert_members ON public.church_post_comments;
CREATE POLICY church_post_comments_insert_members ON public.church_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.church_posts p
      JOIN public.church_members cm ON cm.church_id = p.church_id
      WHERE p.id = church_post_comments.post_id
        AND cm.user_id = auth.uid()
        AND cm.approved = true
    )
  );

DROP POLICY IF EXISTS church_post_comments_update_own ON public.church_post_comments;
CREATE POLICY church_post_comments_update_own ON public.church_post_comments
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.church_posts p
      JOIN public.church_members cm ON cm.church_id = p.church_id
      WHERE p.id = church_post_comments.post_id
        AND cm.user_id = auth.uid()
        AND cm.approved = true
    )
  )
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.church_posts p
      JOIN public.church_members cm ON cm.church_id = p.church_id
      WHERE p.id = church_post_comments.post_id
        AND cm.user_id = auth.uid()
        AND cm.approved = true
    )
  );

DROP POLICY IF EXISTS church_post_comments_delete_own ON public.church_post_comments;
CREATE POLICY church_post_comments_delete_own ON public.church_post_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS church_posts_update_author ON public.church_posts;
CREATE POLICY church_posts_update_author ON public.church_posts
  FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.church_members cm
      WHERE cm.church_id = church_posts.church_id
        AND cm.user_id = auth.uid()
        AND cm.approved = true
    )
  )
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.church_members cm
      WHERE cm.church_id = church_posts.church_id
        AND cm.user_id = auth.uid()
        AND cm.approved = true
    )
  );

DROP POLICY IF EXISTS church_posts_delete_author ON public.church_posts;
CREATE POLICY church_posts_delete_author ON public.church_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_church_post_engagement_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'church_post_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.church_posts
      SET likes_count = COALESCE(likes_count, 0) + 1
      WHERE id = NEW.post_id;
      RETURN NEW;
    END IF;

    UPDATE public.church_posts
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.church_posts
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.church_posts
  SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS church_post_likes_sync_count ON public.church_post_likes;
CREATE TRIGGER church_post_likes_sync_count
  AFTER INSERT OR DELETE ON public.church_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_church_post_engagement_counts();

DROP TRIGGER IF EXISTS church_post_comments_sync_count ON public.church_post_comments;
CREATE TRIGGER church_post_comments_sync_count
  AFTER INSERT OR DELETE ON public.church_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_church_post_engagement_counts();

UPDATE public.church_posts p
SET likes_count = (SELECT count(*) FROM public.church_post_likes l WHERE l.post_id = p.id),
    comments_count = (SELECT count(*) FROM public.church_post_comments c WHERE c.post_id = p.id);
