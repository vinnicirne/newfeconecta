CREATE TABLE IF NOT EXISTS church_group_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES church_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE church_group_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias solicitações" ON church_group_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Líderes podem ver solicitações do seu grupo" ON church_group_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM church_groups
      WHERE church_groups.id = church_group_requests.group_id
      AND church_groups.leader_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar solicitações" ON church_group_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Líderes podem atualizar solicitações" ON church_group_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM church_groups
      WHERE church_groups.id = church_group_requests.group_id
      AND church_groups.leader_id = auth.uid()
    )
  );
