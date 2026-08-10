-- Criação da função de Trigger para notificar um Novo Match
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER AS $$
DECLARE
  v_user1_name text;
  v_user2_name text;
BEGIN
  -- Busca os nomes dos usuários envolvidos
  SELECT full_name INTO v_user1_name FROM public.profiles WHERE id = NEW.user1_id;
  SELECT full_name INTO v_user2_name FROM public.profiles WHERE id = NEW.user2_id;

  -- Insere notificação para o user1
  INSERT INTO public.notifications (
    recipient_id,
    sender_id,
    type,
    content,
    is_read,
    created_at
  ) VALUES (
    NEW.user1_id,
    NEW.user2_id,
    'match',
    'Você tem um novo Match Divino com ' || v_user2_name || '! Venha conferir.',
    false,
    NOW()
  );

  -- Insere notificação para o user2
  INSERT INTO public.notifications (
    recipient_id,
    sender_id,
    type,
    content,
    is_read,
    created_at
  ) VALUES (
    NEW.user2_id,
    NEW.user1_id,
    'match',
    'Você tem um novo Match Divino com ' || v_user1_name || '! Venha conferir.',
    false,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o trigger antigo se existir
DROP TRIGGER IF EXISTS on_dating_match_created ON public.dating_matches;

-- Cria o trigger na tabela dating_matches
CREATE TRIGGER on_dating_match_created
  AFTER INSERT ON public.dating_matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_match();
