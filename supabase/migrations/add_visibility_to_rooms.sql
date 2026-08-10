-- Migration: Add visibility to rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- Update existing rooms to be public
UPDATE public.rooms SET visibility = 'public' WHERE visibility IS NULL;
