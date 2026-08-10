CREATE POLICY "Authors can view own journeys" ON public.sanctuary_journeys
    FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Anyone can view published journeys" ON public.sanctuary_journeys
    FOR SELECT USING (is_published = true);

-- E também para os capítulos
CREATE POLICY "Anyone can view chapters of published journeys" ON public.sanctuary_chapters
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.is_published = true)
    );

CREATE POLICY "Authors can view own chapters" ON public.sanctuary_chapters
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );
