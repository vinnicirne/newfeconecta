-- Migration para adicionar notificação push de Boas-Vindas automática
-- Data: 2026-06-16

-- Criação da Função Trigger
CREATE OR REPLACE FUNCTION public.send_welcome_push_on_token()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se o token foi adicionado pela primeira vez
    IF OLD.fcm_token IS NULL AND NEW.fcm_token IS NOT NULL THEN
        
        -- Anti-spam: Verifica se o usuário já não recebeu um 'welcome'
        IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE recipient_id = NEW.id AND type = 'welcome') THEN
            
            -- Insere a notificação. A Edge Function de Push fará a interceptação
            INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, is_read, priority, metadata)
            VALUES (
                NEW.id,
                '5034f23f-4197-4f1a-aa88-23e9fd26f1bf',
                'welcome',
                'Bem-vindo ao FeConecta!',
                'Que alegria ter voce conosco! Explore a rede, seja edificado e convide um amigo.',
                false,
                'high',
                '{"push_banner": true, "sound": "default"}'::jsonb
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exclui o trigger antigo se existir
DROP TRIGGER IF EXISTS tr_welcome_push_on_token ON public.profiles;

-- Cria e vincula o novo trigger
CREATE TRIGGER tr_welcome_push_on_token
AFTER UPDATE OF fcm_token ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_push_on_token();
