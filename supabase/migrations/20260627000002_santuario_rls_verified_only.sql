-- Restoring RLS: ONLY VERIFIED users can create devotionals/journeys in the Sanctuary.
-- Normal users use /notes.

DROP POLICY IF EXISTS "Users can insert journeys" ON public.sanctuary_journeys;
DROP POLICY IF EXISTS "Authors can update own journeys" ON public.sanctuary_journeys;

-- Apenas Verificados inserem (rascunhos ou publicados)
CREATE POLICY "Verified users can insert journeys" ON public.sanctuary_journeys
    FOR INSERT WITH CHECK (
        auth.uid() = author_id 
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
    );

-- Apenas Verificados atualizam suas próprias jornadas
CREATE POLICY "Authors can update own journeys" ON public.sanctuary_journeys
    FOR UPDATE USING (
        auth.uid() = author_id
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
    );
