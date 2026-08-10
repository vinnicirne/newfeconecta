-- 1. PRE-FLIGHT (PROFILES): Garante que TODAS as colunas necessárias existam na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS church TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_likes BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_follows BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_reposts BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_mentions BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_hashtags BOOLEAN DEFAULT TRUE;

-- 2. PRE-FLIGHT (POSTS): Garante que as colunas de Destaques e Stories existam
-- Se estas faltarem, o RPC de perfil falhará com erro 400
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'post';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS highlight_title TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS highlight_cover_url TEXT;

-- 3. LIMPEZA DE FUNÇÕES ANTIGAS
DROP FUNCTION IF EXISTS get_profile_with_state(text, uuid);
DROP FUNCTION IF EXISTS get_full_profile_data(uuid);

-- 4. FUNÇÃO PARA PERFIL PÚBLICO (Busca por Username)
CREATE OR REPLACE FUNCTION get_profile_with_state(p_username text, p_viewer_id uuid)
RETURNS json AS $$
DECLARE
    profile_record RECORD;
    profile_data json;
    viewer_state_data json;
    posts_data json;
    liked_posts_data json;
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM public.profiles WHERE username = p_username;
    IF target_user_id IS NULL THEN RETURN NULL; END IF;

    SELECT 
        id, username, full_name, avatar_url, banner_url, bio, church, 
        is_verified, verification_label, followers_count, following_count, posts_count,
        instagram_url, whatsapp_url, linkedin_url, youtube_url, website_url
    INTO profile_record
    FROM public.profiles WHERE id = target_user_id;

    profile_data := json_build_object(
        'id', profile_record.id,
        'username', profile_record.username,
        'full_name', profile_record.full_name,
        'avatar_url', profile_record.avatar_url,
        'banner_url', profile_record.banner_url,
        'bio', profile_record.bio,
        'church', profile_record.church,
        'is_verified', profile_record.is_verified,
        'verification_label', profile_record.verification_label,
        'followerCount', COALESCE(profile_record.followers_count, 0),
        'followingCount', COALESCE(profile_record.following_count, 0),
        'postCount', COALESCE(profile_record.posts_count, 0),
        'instagram_url', profile_record.instagram_url,
        'whatsapp_url', profile_record.whatsapp_url,
        'linkedin_url', profile_record.linkedin_url,
        'youtube_url', profile_record.youtube_url,
        'website_url', profile_record.website_url
    );

    SELECT json_build_object(
        'is_following', (SELECT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = target_user_id))
    ) INTO viewer_state_data;

    SELECT json_agg(t) INTO posts_data FROM (
        SELECT p.*, pr.full_name as author_name, pr.username as author_username, pr.avatar_url as author_avatar
        FROM public.posts p
        JOIN public.profiles pr ON p.author_id = pr.id
        WHERE p.author_id = target_user_id 
        AND p.post_type != 'story'  -- Oculta stories do feed normal
        ORDER BY p.created_at DESC LIMIT 15
    ) t;

    SELECT json_agg(t) INTO liked_posts_data FROM (
        SELECT p.*, pr.full_name as author_name, pr.username as author_username, pr.avatar_url as author_avatar
        FROM public.posts p
        JOIN public.post_likes pl ON p.id = pl.post_id
        JOIN public.profiles pr ON p.author_id = pr.id
        WHERE pl.profile_id = target_user_id ORDER BY pl.created_at DESC LIMIT 15
    ) t;

    RETURN json_build_object(
        'profile', profile_data,
        'viewer_state', viewer_state_data,
        'posts', COALESCE(posts_data, '[]'::json),
        'liked_posts', COALESCE(liked_posts_data, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO PARA PERFIL COMPLETO (Busca por ID)
CREATE OR REPLACE FUNCTION get_full_profile_data(p_user_id uuid)
RETURNS json AS $$
DECLARE
    profile_record RECORD;
    profile_data json;
    posts_data json;
    liked_posts_data json;
    saved_posts_data json;
    stories_data json;
    highlights_data json;
BEGIN
    SELECT 
        id, username, full_name, avatar_url, banner_url, bio, church, 
        is_verified, verification_label, followers_count, following_count, posts_count,
        instagram_url, whatsapp_url, linkedin_url, youtube_url, website_url,
        notify_likes, notify_comments, notify_follows, notify_reposts, notify_mentions, notify_hashtags
    INTO profile_record
    FROM public.profiles WHERE id = p_user_id;

    IF profile_record.id IS NULL THEN RETURN NULL; END IF;

    profile_data := json_build_object(
        'id', profile_record.id,
        'username', profile_record.username,
        'full_name', profile_record.full_name,
        'avatar_url', profile_record.avatar_url,
        'banner_url', profile_record.banner_url,
        'bio', profile_record.bio,
        'church', profile_record.church,
        'is_verified', profile_record.is_verified,
        'verification_label', profile_record.verification_label,
        'followers_count', COALESCE(profile_record.followers_count, 0),
        'following_count', COALESCE(profile_record.following_count, 0),
        'posts_count', COALESCE(profile_record.posts_count, 0),
        'instagram_url', profile_record.instagram_url,
        'whatsapp_url', profile_record.whatsapp_url,
        'linkedin_url', profile_record.linkedin_url,
        'youtube_url', profile_record.youtube_url,
        'website_url', profile_record.website_url,
        'notify_likes', COALESCE(profile_record.notify_likes, true),
        'notify_comments', COALESCE(profile_record.notify_comments, true),
        'notify_follows', COALESCE(profile_record.notify_follows, true),
        'notify_reposts', COALESCE(profile_record.notify_reposts, true),
        'notify_mentions', COALESCE(profile_record.notify_mentions, true),
        'notify_hashtags', COALESCE(profile_record.notify_hashtags, true)
    );

    SELECT json_agg(t) INTO posts_data FROM (
        SELECT p.*, pr.full_name as author_name, pr.username as author_username, pr.avatar_url as author_avatar
        FROM public.posts p
        JOIN public.profiles pr ON p.author_id = pr.id
        WHERE p.author_id = p_user_id 
        AND p.post_type != 'story'
        ORDER BY p.created_at DESC LIMIT 30
    ) t;

    SELECT json_agg(t) INTO liked_posts_data FROM (
        SELECT p.*, pr.full_name as author_name, pr.username as author_username, pr.avatar_url as author_avatar
        FROM public.posts p
        JOIN public.post_likes pl ON p.id = pl.post_id
        JOIN public.profiles pr ON p.author_id = pr.id
        WHERE pl.profile_id = p_user_id ORDER BY pl.created_at DESC LIMIT 20
    ) t;

    SELECT json_agg(t) INTO saved_posts_data FROM (
        SELECT p.*, pr.full_name as author_name, pr.username as author_username, pr.avatar_url as author_avatar
        FROM public.posts p
        JOIN public.saved_posts sp ON p.id = sp.post_id
        JOIN public.profiles pr ON p.author_id = pr.id
        WHERE sp.user_id = p_user_id ORDER BY sp.created_at DESC LIMIT 20
    ) t;

    -- Stories ativos (últimas 24h)
    SELECT json_agg(t) INTO stories_data FROM (
        SELECT * FROM public.posts 
        WHERE author_id = p_user_id 
        AND post_type = 'story' 
        AND created_at > (now() - interval '24 hours')
        ORDER BY created_at ASC
    ) t;

    -- Destaques (highlights)
    SELECT json_agg(t) INTO highlights_data FROM (
        SELECT * FROM public.posts 
        WHERE author_id = p_user_id 
        AND highlight_title IS NOT NULL
        ORDER BY created_at DESC
    ) t;

    RETURN json_build_object(
        'profile', profile_data,
        'posts', COALESCE(posts_data, '[]'::json),
        'liked', COALESCE(liked_posts_data, '[]'::json),
        'saved', COALESCE(saved_posts_data, '[]'::json),
        'stories', COALESCE(stories_data, '[]'::json),
        'highlights', COALESCE(highlights_data, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
