-- Fix: ensure PostgREST can join comments -> profiles
-- Error observed: PGRST200 (no relationship between comments and profiles in schema cache)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'comments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'comments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name = 'comments_profile_id_fkey'
    ) THEN
      ALTER TABLE public.comments
        ADD CONSTRAINT comments_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'daily_verse_comments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'daily_verse_comments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name = 'daily_verse_comments_profile_id_fkey'
    ) THEN
      ALTER TABLE public.daily_verse_comments
        ADD CONSTRAINT daily_verse_comments_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

