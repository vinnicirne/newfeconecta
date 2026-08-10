import { supabase } from "@/lib/supabase";

export interface ChurchGroup {
  id: string;
  church_id: string;
  name: string;
  type: 'cell' | 'ministry';
  leader_id: string;
  meeting_day?: string;
  meeting_time?: string;
  created_at?: string;
  logo_url?: string;
  privacy?: 'public' | 'private' | 'invisible';
}

export const GroupService = {
  async getGroups(churchId: string) {
    const { data, error } = await supabase
      .from('church_groups')
      .select('*, leader:profiles!leader_id(id, full_name, avatar_url)')
      .eq('church_id', churchId)
      .order('type');
    
    if (error) throw error;
    return data;
  },

  async createGroup(group: Omit<ChurchGroup, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('church_groups')
      .insert([group])
      .select('*, leader:profiles!leader_id(id, full_name, avatar_url)')
      .single();
      
    if (error) throw error;
    
    // Add the leader to group members automatically
    if (data?.leader_id) {
      await supabase.from('church_group_members').insert({
        group_id: data.id,
        user_id: data.leader_id,
        role: 'leader'
      });
    }
    
    return data;
  },

  async updateGroup(id: string, updates: Partial<Omit<ChurchGroup, 'id' | 'church_id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('church_groups')
      .update(updates)
      .eq('id', id)
      .select('*, leader:profiles!leader_id(id, full_name, avatar_url)')
      .single();
      
    if (error) throw error;
    return data;
  },

  async deleteGroup(id: string) {
    const { error } = await supabase
      .from('church_groups')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }
};
