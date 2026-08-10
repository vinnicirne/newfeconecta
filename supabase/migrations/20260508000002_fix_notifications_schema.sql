-- 1. Expansão do Enum de Tipos de Notificação
-- Nota: Usamos DO block para evitar erros se o valor já existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'notification_type' AND e.enumlabel = 'verse_day') THEN
        ALTER TYPE notification_type ADD VALUE 'verse_day';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'notification_type' AND e.enumlabel = 'hashtag') THEN
        ALTER TYPE notification_type ADD VALUE 'hashtag';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'notification_type' AND e.enumlabel = 'room_invite') THEN
        ALTER TYPE notification_type ADD VALUE 'room_invite';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'notification_type' AND e.enumlabel = 'message') THEN
        ALTER TYPE notification_type ADD VALUE 'message';
    END IF;
EXCEPTION
    WHEN others THEN 
        RAISE NOTICE 'Aviso: Erro ao alterar TYPE (pode já existir ou não ser um ENUM).';
END $$;

-- 2. Garantia de Colunas de Preferência na tabela Profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_likes') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_likes BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_comments') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_comments BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_follows') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_follows BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_reposts') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_reposts BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_mentions') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_mentions BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_hashtags') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_hashtags BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Atualização de RLS (Caso necessário para novas colunas)
-- Garantir que o usuário possa ler suas próprias preferências
DROP POLICY IF EXISTS "Usuários podem ler suas próprias preferências" ON public.profiles;
CREATE POLICY "Usuários podem ler suas próprias preferências" ON public.profiles 
FOR SELECT USING (auth.uid() = id);
