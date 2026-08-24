-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: MÓDULO SALAS, WAR ROOM & ORAÇÃO
-- Data: 2026-08-24
-- =========================================================================

-- 1. BLINDAGEM RLS EM ROOMS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rooms', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "rooms_select_policy" ON public.rooms 
  FOR SELECT USING (
    visibility = 'public' OR 
    creator_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.participants WHERE room_id = rooms.id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "rooms_insert_policy" ON public.rooms 
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "rooms_update_policy" ON public.rooms 
  FOR UPDATE USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  ) WITH CHECK (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "rooms_delete_policy" ON public.rooms 
  FOR DELETE USING (
    auth.uid() = creator_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.rooms TO authenticated, service_role;
GRANT SELECT ON TABLE public.rooms TO anon;


-- 2. BLINDAGEM RLS EM PARTICIPANTS (WAR ROOM)
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'participants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.participants', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "participants_select_policy" ON public.participants 
  FOR SELECT USING (true);

CREATE POLICY "participants_insert_policy" ON public.participants 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "participants_update_policy" ON public.participants 
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  ) WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "participants_delete_policy" ON public.participants 
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.participants TO authenticated, service_role;
GRANT SELECT ON TABLE public.participants TO anon;


-- 3. BLINDAGEM RLS EM PRAYER_ROOMS (SALA DE ORAÇÃO)
ALTER TABLE public.prayer_rooms ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prayer_rooms' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.prayer_rooms', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "prayer_rooms_select_policy" ON public.prayer_rooms 
  FOR SELECT USING (true);

CREATE POLICY "prayer_rooms_insert_policy" ON public.prayer_rooms 
  FOR INSERT WITH CHECK (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "prayer_rooms_update_policy" ON public.prayer_rooms 
  FOR UPDATE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  ) WITH CHECK (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "prayer_rooms_delete_policy" ON public.prayer_rooms 
  FOR DELETE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.prayer_rooms TO authenticated, service_role;
GRANT SELECT ON TABLE public.prayer_rooms TO anon;


-- 4. BLINDAGEM RLS EM PRAYER_ROOM_PARTICIPANTS
ALTER TABLE public.prayer_room_participants ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prayer_room_participants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.prayer_room_participants', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "prayer_room_participants_select_policy" ON public.prayer_room_participants 
  FOR SELECT USING (true);

CREATE POLICY "prayer_room_participants_insert_policy" ON public.prayer_room_participants 
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.prayer_rooms WHERE id = room_id AND host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "prayer_room_participants_update_policy" ON public.prayer_room_participants 
  FOR UPDATE USING (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.prayer_rooms WHERE id = room_id AND host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  ) WITH CHECK (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.prayer_rooms WHERE id = room_id AND host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "prayer_room_participants_delete_policy" ON public.prayer_room_participants 
  FOR DELETE USING (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.prayer_rooms WHERE id = room_id AND host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.prayer_room_participants TO authenticated, service_role;
GRANT SELECT ON TABLE public.prayer_room_participants TO anon;


-- 5. BLINDAGEM RLS EM PRAYER_ROOM_MESSAGES
ALTER TABLE public.prayer_room_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prayer_room_messages' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.prayer_room_messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "prayer_room_messages_select_policy" ON public.prayer_room_messages 
  FOR SELECT USING (true);

CREATE POLICY "prayer_room_messages_insert_policy" ON public.prayer_room_messages 
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "prayer_room_messages_delete_policy" ON public.prayer_room_messages 
  FOR DELETE USING (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.prayer_rooms WHERE id = room_id AND host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.prayer_room_messages TO authenticated, service_role;
GRANT SELECT ON TABLE public.prayer_room_messages TO anon;


-- 6. BLINDAGEM RLS EM PRAYER_ROOM_INVITES
ALTER TABLE public.prayer_room_invites ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prayer_room_invites' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.prayer_room_invites', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "prayer_room_invites_select_policy" ON public.prayer_room_invites 
  FOR SELECT USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND username = guest_username) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "prayer_room_invites_insert_policy" ON public.prayer_room_invites 
  FOR INSERT WITH CHECK (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "prayer_room_invites_update_policy" ON public.prayer_room_invites 
  FOR UPDATE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND username = guest_username) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  ) WITH CHECK (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND username = guest_username) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "prayer_room_invites_delete_policy" ON public.prayer_room_invites 
  FOR DELETE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.prayer_room_invites TO authenticated, service_role;

