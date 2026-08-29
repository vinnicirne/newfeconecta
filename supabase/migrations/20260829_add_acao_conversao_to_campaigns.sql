-- Adiciona coluna acao_conversao na tabela campaigns se ainda não existir
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS acao_conversao TEXT DEFAULT 'whatsapp';
