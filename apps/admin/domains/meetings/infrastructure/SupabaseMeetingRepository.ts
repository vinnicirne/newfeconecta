import { supabase } from "@/lib/supabase";
import { Meeting, IMeetingRepository, MeetingQuery, MeetingRole } from "../domain/Meeting";
import moment from "moment";

export class SupabaseMeetingRepository implements IMeetingRepository {
  async query(params: MeetingQuery): Promise<Meeting[]> {
    let query = supabase
      .from("church_events")
      .select("*")
      .eq("reference_id", params.groupId)
      .eq("reference_type", params.groupType)
      .order("event_date", { ascending: true });

    if (params.from) {
      query = query.gte("event_date", moment(params.from).format("YYYY-MM-DD"));
    }
    if (params.to) {
      query = query.lte("event_date", moment(params.to).format("YYYY-MM-DD"));
    }

    const { data: events, error } = await query;
    if (error || !events) {
      console.error("Meeting fetch error:", error);
      return [];
    }

    let mappedEvents = events as Meeting[];

    // ✅ Coleta todos os IDs de criadores em uma única query (em vez de N queries)
    const creatorIds = Array.from(new Set(mappedEvents.filter(e => e.created_by).map(e => e.created_by)));

    // ✅ Dispara roles + profiles de criadores em paralelo
    const [rolesResult, profilesResult] = await Promise.all([
      params.includeRoles && mappedEvents.length > 0
        ? supabase.from("church_event_roles").select("*").in("event_id", mappedEvents.map(e => e.id))
        : Promise.resolve({ data: null, error: null }),
      creatorIds.length > 0
        ? supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', creatorIds as string[])
        : Promise.resolve({ data: null, error: null })
    ]);

    // Mapeia perfis dos criadores
    const creatorProfiles = profilesResult.data || [];
    if (creatorProfiles.length > 0) {
      mappedEvents = mappedEvents.map(e => {
        const profile = creatorProfiles.find((p: any) => p.id === e.created_by);
        return profile ? { ...e, author: profile } : e;
      });
    }

    // ✅ Mapeia roles sem queries adicionais por profile
    if (rolesResult.data && rolesResult.data.length > 0) {
      const roles = rolesResult.data as MeetingRole[];

      // Coleta todos os assigned_to IDs de uma vez
      const assigneeIds = Array.from(new Set(roles.filter((r: any) => r.assigned_to).map((r: any) => r.assigned_to)));

      let assigneeProfiles: any[] = [];
      if (assigneeIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .in("id", assigneeIds as string[]);
        assigneeProfiles = data || [];
      }

      // Mapeia cada role com o perfil correspondente (sem queries adicionais)
      const mappedRoles = roles.map((role: any) => {
        if (role.assigned_to) {
          const profile = assigneeProfiles.find((p: any) => p.id === role.assigned_to);
          return profile ? { ...role, assigned: profile } : role;
        }
        return role;
      });

      mappedEvents = mappedEvents.map(e => ({
        ...e,
        roles: mappedRoles.filter((r: any) => r.event_id === e.id)
      }));
    }

    return mappedEvents;
  }
}
