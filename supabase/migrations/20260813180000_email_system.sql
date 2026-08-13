-- Tabela de Templates de Email
CREATE TABLE IF NOT EXISTS public.email_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Logs de Email
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email text NOT NULL,
    template_key text NOT NULL,
    status text NOT NULL CHECK (status IN ('success', 'error')),
    error_message text,
    sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para Admin
CREATE POLICY "Admins podem ver e editar templates" 
ON public.email_templates 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins podem ver logs de emails" 
ON public.email_logs 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Inserir o template Welcome Padrão
INSERT INTO public.email_templates (key, subject, html_content) 
VALUES (
    'welcome',
    'Bem-vindo(a) à FéConecta! 👋',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #00A676; margin-bottom: 10px;">Bem-vindo(a) à FéConecta!</h1>
    <p style="color: #a3a3a3; font-size: 16px;">Um lugar de adoração.</p>
  </div>
  
  <div style="background-color: #1a1a1a; padding: 25px; border-radius: 8px; border: 1px solid #333;">
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #ffffff;">
      Olá, <strong>{{name}}</strong>!<br><br>
      Estamos muito felizes em ter você conosco. A plataforma FéConecta foi criada para conectar, edificar e transformar através da fé.
    </p>
    
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ffffff;">
      Seu perfil já está configurado e você já pode acessar nossa rede, participar da Sala de Guerra e interagir com a comunidade.
    </p>
    
    <div style="text-align: center; margin-bottom: 20px;">
      <a href="https://feconecta.com.br" style="display: inline-block; background-color: #00A676; color: #0a0a0a; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px;">
        Acessar o App FéConecta
      </a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
    <p>© 2026 FéConecta. Todos os direitos reservados.</p>
  </div>
</div>'
) ON CONFLICT (key) DO NOTHING;
