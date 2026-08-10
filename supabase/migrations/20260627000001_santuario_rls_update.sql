-- Update RLS to allow private devotionals for all users
DROP POLICY IF EXISTS "Verified users can insert journeys" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Authors can update own journeys" ON public.sanctuary_journeys;

CREATE POLICY "Users can insert journeys" ON public.sanctuary_journeys
    FOR INSERT WITH CHECK (
        auth.uid() = author_id 
        AND (
            is_published = false 
            OR 
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
        )
    );

CREATE POLICY "Authors can update own journeys" ON public.sanctuary_journeys
    FOR UPDATE USING (auth.uid() = author_id)
    WITH CHECK (
        is_published = false 
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
    );

-- Update Chapters
DROP POLICY IF EXISTS "Authors can insert chapters" ON public.sanctuary_chapters;
DROP POLICY IF EXISTS "Authors can update chapters" ON public.sanctuary_chapters;
DROP POLICY IF EXISTS "Authors can delete chapters" ON public.sanctuary_chapters;

CREATE POLICY "Authors can insert chapters" ON public.sanctuary_chapters
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );
CREATE POLICY "Authors can update chapters" ON public.sanctuary_chapters
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );
CREATE POLICY "Authors can delete chapters" ON public.sanctuary_chapters
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );
