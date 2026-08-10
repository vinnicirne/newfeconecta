create policy "All can insert tracks" on church_discipleship_tracks for insert with check (true);
create policy "All can update tracks" on church_discipleship_tracks for update using (true);
create policy "All can delete tracks" on church_discipleship_tracks for delete using (true);

create policy "All can insert lessons" on church_discipleship_lessons for insert with check (true);
create policy "All can update lessons" on church_discipleship_lessons for update using (true);
create policy "All can delete lessons" on church_discipleship_lessons for delete using (true);
