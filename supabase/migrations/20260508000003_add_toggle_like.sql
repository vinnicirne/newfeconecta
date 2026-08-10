-- Função RPC para alternar curtidas (like/unlike) de forma atômica
CREATE OR REPLACE FUNCTION toggle_like(p_post_id UUID, p_profile_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_liked BOOLEAN;
BEGIN
  -- 1. Verifica se a curtida já existe
  SELECT EXISTS (
    SELECT 1 FROM public.post_likes 
    WHERE post_id = p_post_id AND profile_id = p_profile_id
  ) INTO v_is_liked;

  -- 2. Se já curtiu, remove (unlike)
  IF v_is_liked THEN
    DELETE FROM public.post_likes 
    WHERE post_id = p_post_id AND profile_id = p_profile_id;
    RETURN FALSE; -- Indica que não está mais curtido
  ELSE
    -- 3. Se não curtiu, insere (like)
    -- ON CONFLICT garante que nunca dispare erro de chave duplicada
    INSERT INTO public.post_likes (post_id, profile_id)
    VALUES (p_post_id, p_profile_id)
    ON CONFLICT (post_id, profile_id) DO NOTHING;
    RETURN TRUE; -- Indica que agora está curtido
  END IF;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION toggle_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_like(UUID, UUID) TO service_role;
