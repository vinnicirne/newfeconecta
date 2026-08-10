-- Script para Limpeza Automática de Mídias Órfãs (Garbage Collection)
-- Meta: Reduzir custos de Storage e remover arquivos sem referência no banco.

-- 1. Habilitar a extensão pg_cron (se suportado pelo provedor/self-host)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Criar a função de varredura
CREATE OR REPLACE FUNCTION public.cleanup_orphan_media()
RETURNS void AS $$
BEGIN
  -- Este script busca arquivos no bucket 'posts' (que é onde as mídias vão parar)
  -- e deleta da tabela storage.objects as linhas que NÃO possuem 
  -- uma URL correspondente na tabela public.posts e também têm mais de 24 horas 
  -- (para não apagar uploads em andamento).
  
  DELETE FROM storage.objects
  WHERE bucket_id = 'posts'
    AND created_at < NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1 
      FROM public.posts p
      -- Consideramos que p.media_url contenha o nome do arquivo (ex: /storage/v1/object/public/posts/XXX.jpg)
      -- strpos verifica se o nome do arquivo existe dentro da URL do post
      WHERE strpos(p.media_url, storage.objects.name) > 0
    );

  -- Aqui poderíamos adicionar limpezas para 'avatars' ou 'stories'
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Agendar o Cron Job para rodar todos os dias às 03:00 AM (horário de menor tráfego)
-- Apenas executa se pg_cron estiver ativado e funcional.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-orphan-media', '0 3 * * *', 'SELECT public.cleanup_orphan_media()');
  END IF;
END $$;
