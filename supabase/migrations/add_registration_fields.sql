-- Migração: Adiciona campos de cadastro ao profiles
-- Executar no Supabase SQL Editor

-- Novos campos para o cadastro completo
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;

-- Garante que username seja único
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_username_unique'
  ) THEN
    CREATE UNIQUE INDEX profiles_username_unique ON profiles (username) WHERE username IS NOT NULL;
  END IF;
END $$;

-- Garante que email seja único nos profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_email_unique'
  ) THEN
    CREATE UNIQUE INDEX profiles_email_unique ON profiles (email) WHERE email IS NOT NULL;
  END IF;
END $$;
