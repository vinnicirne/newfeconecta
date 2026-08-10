-- Grant privileges for Sanctuary tables
GRANT ALL ON TABLE public.sanctuary_journeys TO anon, authenticated;
GRANT ALL ON TABLE public.sanctuary_chapters TO anon, authenticated;
GRANT ALL ON TABLE public.sanctuary_progress TO anon, authenticated;

-- Force reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
