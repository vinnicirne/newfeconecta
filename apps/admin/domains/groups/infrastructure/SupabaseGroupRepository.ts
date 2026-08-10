import { supabase } from "@/lib/supabase";
import { Group, IGroupRepository } from "../domain/Group";

export class SupabaseGroupRepository implements IGroupRepository {
  async getById(id: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from("church_groups")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      console.error("Group fetch error:", error);
      return null;
    }

    return data as Group;
  }
}
