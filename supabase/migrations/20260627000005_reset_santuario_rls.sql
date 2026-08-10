-- Resetting policies for Sanctuary

ALTER TABLE public.sanctuary_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctuary_chapters ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view published journeys" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Authors can view own drafts" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Authors can view own journeys" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Users can insert journeys" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Verified users can insert journeys" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Only verified users can insert journeys" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Authors can update own journeys" ON public.sanctuary_journeys;

DROP POLICY IF EXISTS "Anyone can view chapters of published journeys" ON public.sanctuary_chapters;
DROP POLICY IF EXISTS "Authors can view own chapters" ON public.sanctuary_chapters;
DROP POLICY IF EXISTS "Authors can insert chapters" ON public.sanctuary_chapters;
DROP POLICY IF EXISTS "Authors can update own chapters" ON public.sanctuary_chapters;

-- --------------------------------------------------------
-- JOURNEYS POLICIES
-- --------------------------------------------------------

-- SELECT: Anyone can read published, authors can read their own
CREATE POLICY "Journeys_Select" ON public.sanctuary_journeys
    FOR SELECT USING (is_published = true OR auth.uid() = author_id);

-- INSERT: Authenticated users can insert their own journeys
CREATE POLICY "Journeys_Insert" ON public.sanctuary_journeys
    FOR INSERT WITH CHECK (auth.uid() = author_id);

-- UPDATE: Authors can update their own
CREATE POLICY "Journeys_Update" ON public.sanctuary_journeys
    FOR UPDATE USING (auth.uid() = author_id);

-- DELETE: Authors can delete their own
CREATE POLICY "Journeys_Delete" ON public.sanctuary_journeys
    FOR DELETE USING (auth.uid() = author_id);

-- --------------------------------------------------------
-- CHAPTERS POLICIES
-- --------------------------------------------------------

-- SELECT: Anyone can read if journey is published, authors can always read
CREATE POLICY "Chapters_Select" ON public.sanctuary_chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sanctuary_journeys j 
            WHERE j.id = journey_id AND (j.is_published = true OR j.author_id = auth.uid())
        )
    );

-- INSERT: Authors of the journey can insert
CREATE POLICY "Chapters_Insert" ON public.sanctuary_chapters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sanctuary_journeys j 
            WHERE j.id = journey_id AND j.author_id = auth.uid()
        )
    );

-- UPDATE: Authors of the journey can update
CREATE POLICY "Chapters_Update" ON public.sanctuary_chapters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sanctuary_journeys j 
            WHERE j.id = journey_id AND j.author_id = auth.uid()
        )
    );

-- DELETE: Authors of the journey can delete
CREATE POLICY "Chapters_Delete" ON public.sanctuary_chapters
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.sanctuary_journeys j 
            WHERE j.id = journey_id AND j.author_id = auth.uid()
        )
    );

-- Force role trigger
NOTIFY pgrst, 'reload schema';
