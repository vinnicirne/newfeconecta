-- Script de Estabilização do Contador de Comentários (Zero Spam & Deduplicação)
-- Data: 2026-06-16

-- 1. Remoção de todos os triggers conflitantes conhecidos na tabela comments
DROP TRIGGER IF EXISTS tr_comments_sync ON public.comments;
DROP TRIGGER IF EXISTS tr_comments_count ON public.comments;
DROP TRIGGER IF EXISTS tr_sync_counts_comments ON public.comments;

-- 2. Garantir que a função oficial de sincronização está correta
CREATE OR REPLACE FUNCTION public.sync_post_social_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronização de Republicações
    IF (TG_TABLE_NAME = 'reposts') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.posts SET reposts_count = COALESCE(reposts_count, 0) + 1 WHERE id = NEW.post_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.posts SET reposts_count = GREATEST(0, COALESCE(reposts_count, 0) - 1) WHERE id = OLD.post_id;
        END IF;
    
    -- Sincronização de Salvamentos
    ELSIF (TG_TABLE_NAME = 'saved_posts') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.posts SET saved_count = COALESCE(saved_count, 0) + 1 WHERE id = NEW.post_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.posts SET saved_count = GREATEST(0, COALESCE(saved_count, 0) - 1) WHERE id = OLD.post_id;
        END IF;

    -- Sincronização de Comentários
    ELSIF (TG_TABLE_NAME = 'comments') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE public.posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE public.posts SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriação atômica do único trigger válido
CREATE TRIGGER tr_comments_sync 
AFTER INSERT OR DELETE ON public.comments 
FOR EACH ROW EXECUTE FUNCTION public.sync_post_social_stats();

-- 4. Recalibração absoluta dos contadores de comentários para todos os posts
UPDATE public.posts p 
SET comments_count = (
    SELECT count(*) 
    FROM public.comments c 
    WHERE c.post_id = p.id
);
