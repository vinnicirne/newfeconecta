-- Enable public reading of church_members so counts and lists work correctly
DROP POLICY IF EXISTS "Membros podem ver sua igreja" ON church_members;
CREATE POLICY "Membros visiveis para todos" ON church_members FOR SELECT USING (true);
