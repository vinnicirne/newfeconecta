-- Migration: Fix messages table and enable Realtime
-- 1. Add media_url column if missing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 2. Enable Realtime for the messages table
-- We check if it's already in the publication to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 3. Ensure RLS is active and correct
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_public" ON public.messages;
CREATE POLICY "messages_select_public" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "messages_insert_auth" ON public.messages;
CREATE POLICY "messages_insert_auth" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
