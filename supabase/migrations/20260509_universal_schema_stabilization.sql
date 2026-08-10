-- Migração de Estabilização Universal FéConecta
-- Data: 2026-05-09
-- Descrição: Unificação de colunas user_id/profile_id, criação de RPC toggle_follow e limpeza de tabelas fantasma.

-- 1. ELIMINAÇÃO DE TABELAS FANTASMA
DROP TABLE IF EXISTS public.feed_posts CASCADE;
DROP TABLE IF EXISTS public.post_reposts CASCADE;

-- 2. FUNÇÃO DE SINCRONIZAÇÃO UNIVERSAL
CREATE OR REPLACE FUNCTION public.fn_sync_user_profile_universal()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.user_id IS NOT NULL AND NEW.profile_id IS NULL) THEN
        NEW.profile_id := NEW.user_id;
    ELSIF (NEW.profile_id IS NOT NULL AND NEW.user_id IS NULL) THEN
        NEW.user_id := NEW.profile_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. APLICAÇÃO EM MASSA DE COLUNAS E TRIGGERS
DO $$ 
DECLARE 
    t text;
    tables_to_fix text[] := ARRAY[
        'posts', 'comments', 'post_likes', 'reposts', 'saved_posts', 
        'notifications', 'bible_interactions', 'stories', 'story_likes',
        'hashtag_follows', 'messages', 'participants', 'requests', 
        'user_notes', 'verification_requests', 'system_errors'
    ];
BEGIN 
    FOREACH t IN ARRAY tables_to_fix LOOP
        -- Garante as duas colunas
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE', t);

        -- Instala o espelhamento
        EXECUTE format('DROP TRIGGER IF EXISTS tr_sync_user_profile_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_sync_user_profile_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_sync_user_profile_universal()', t, t);
    END LOOP;
END $$;

-- 4. RPC TOGGLE_FOLLOW (ATÔMICO)
CREATE OR REPLACE FUNCTION public.toggle_follow(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.follows 
        WHERE follower_id = p_follower_id AND following_id = p_following_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.follows 
        WHERE follower_id = p_follower_id AND following_id = p_following_id;
        RETURN FALSE;
    ELSE
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (p_follower_id, p_following_id)
        ON CONFLICT (follower_id, following_id) DO NOTHING;
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RECALCULAR CONTADORES
UPDATE public.posts p
SET 
    likes_count = (SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id),
    likes = COALESCE(ARRAY(SELECT profile_id FROM public.post_likes l WHERE l.post_id = p.id AND profile_id IS NOT NULL), ARRAY[]::uuid[]),
    comments_count = (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id),
    reposts_count = (SELECT count(*) FROM public.reposts r WHERE r.post_id = p.id);

UPDATE public.profiles pr
SET 
    followers_count = (SELECT count(*) FROM public.follows f WHERE f.following_id = pr.id),
    following_count = (SELECT count(*) FROM public.follows f WHERE f.follower_id = pr.id),
    posts_count = (SELECT count(*) FROM public.posts p WHERE p.author_id = pr.id OR p.profile_id = pr.id);
