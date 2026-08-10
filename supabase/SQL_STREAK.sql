-- Tabela de Streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 1,
    longest_streak INTEGER NOT NULL DEFAULT 1,
    last_action_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Habilitar RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem ver seus próprios streaks" 
ON public.user_streaks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios streaks" 
ON public.user_streaks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios streaks" 
ON public.user_streaks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Função SQL para "bater o ponto" diário (RPC)
CREATE OR REPLACE FUNCTION ping_daily_streak(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_record RECORD;
    v_today DATE := CURRENT_DATE;
    v_diff INTEGER;
BEGIN
    SELECT * INTO v_record FROM public.user_streaks WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Primeiro dia!
        INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_action_date)
        VALUES (p_user_id, 1, 1, v_today);
        RETURN json_build_object('streak', 1, 'updated', true);
    ELSE
        v_diff := v_today - v_record.last_action_date;
        
        IF v_diff = 1 THEN
            -- Bateu no dia consecutivo
            UPDATE public.user_streaks 
            SET current_streak = current_streak + 1,
                longest_streak = GREATEST(longest_streak, current_streak + 1),
                last_action_date = v_today
            WHERE user_id = p_user_id;
            
            RETURN json_build_object('streak', v_record.current_streak + 1, 'updated', true);
            
        ELSIF v_diff > 1 THEN
            -- Quebrou a ofensiva
            UPDATE public.user_streaks 
            SET current_streak = 1,
                last_action_date = v_today
            WHERE user_id = p_user_id;
            
            RETURN json_build_object('streak', 1, 'updated', true);
            
        ELSE
            -- Já bateu hoje
            RETURN json_build_object('streak', v_record.current_streak, 'updated', false);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
