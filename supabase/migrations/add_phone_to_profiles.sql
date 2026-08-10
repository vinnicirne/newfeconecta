-- Migration para adicionar o telefone no banco de dados para marketing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
