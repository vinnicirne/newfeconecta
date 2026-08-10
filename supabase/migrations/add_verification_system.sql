-- Adicionar campos de verificação na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_label TEXT;

-- Criar tabela de solicitações de verificação
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    requested_role TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para verification_requests
-- Usuários podem ver suas próprias solicitações
CREATE POLICY "Users can view own verification requests" 
ON public.verification_requests 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Usuários podem criar solicitações
CREATE POLICY "Users can create verification requests" 
ON public.verification_requests 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins (para o dashboard)
DROP POLICY IF EXISTS "Admins can manage all verification requests" ON public.verification_requests;
CREATE POLICY "Admins can manage all verification requests" 
ON public.verification_requests 
FOR ALL 
TO authenticated
USING (true);
