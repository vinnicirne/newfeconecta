export interface Group {
  id: string;
  name: string;
  type: string; // e.g. 'célula', 'ministério'
  church_id: string;
  leader_id?: string;
  avatar_url?: string;
  created_at: string;
}

export interface IGroupRepository {
  getById(id: string): Promise<Group | null>;
}
