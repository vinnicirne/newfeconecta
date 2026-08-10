import { IGroupRepository } from "@/domains/groups/domain/Group";
import { IMeetingRepository } from "@/domains/meetings/domain/Meeting";
import { PreparationCalculator } from "@/domains/meetings/application/PreparationCalculator";
import { PendingTaskGenerator } from "@/domains/meetings/application/PendingTaskGenerator";
import moment from "moment";
import { supabase } from "@/lib/supabase";

export interface FeedItem {
  id: string;
  type: 'EVENT' | 'NOTICE' | 'PRAYER' | 'STUDY';
  author: any;
  created_at: string;
  content: any;
}

export interface DashboardContext {
  group: any;
  permissions: any;
  dashboard: {
    summary: {
      stats: { members: number; visitors: number; meetingsThisMonth: number };
      health: { score: number; growth: number; attendance: number };
    };
    feed: FeedItem[];
  };
  quickActions: any[];
}

export class DashboardAggregator {
  constructor(
    private groupRepo: IGroupRepository,
    private meetingRepo: IMeetingRepository
  ) {}

  async build(groupId: string): Promise<DashboardContext> {
    const group = await this.groupRepo.getById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();

    const [allMeetings, noticesResponse, prayersResponse] = await Promise.all([
      this.meetingRepo.query({
        groupId,
        groupType: group.type,
        includeRoles: true
      }),
      supabase.from('church_events')
        .select('*')
        .eq('reference_id', groupId)
        .eq('reference_type', `${group.type}_notice`)
        .order('created_at', { ascending: false }),
      supabase.from('church_events')
        .select('*')
        .eq('reference_id', groupId)
        .eq('reference_type', `${group.type}_prayer`)
        .order('created_at', { ascending: false })
    ]);

    let notices = noticesResponse.data || [];
    let prayers = prayersResponse.data || [];
    
    // Manual profile fetch for notices and prayers
    const allItems = [...notices, ...prayers];
    if (allItems.length > 0) {
      const creatorIds = Array.from(new Set(allItems.filter(n => n.created_by).map(n => n.created_by)));
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', creatorIds as string[]);
        if (profiles) {
          const mapProfiles = (arr: any[]) => arr.map(n => {
            const profile = profiles.find(p => p.id === n.created_by);
            if (profile) return { ...n, author: profile };
            return n;
          });
          notices = mapProfiles(notices);
          prayers = mapProfiles(prayers);
        }
      }
    }
    const upcomingMeetings = allMeetings.filter(m => moment(m.event_date).isSameOrAfter(moment().startOf('day')));

    const feed: FeedItem[] = [];

    // 1. Add Events to Feed
    upcomingMeetings.forEach(meeting => {
      const prep = PreparationCalculator.calculateFor(meeting, group.type);
      const pendingTasks = PendingTaskGenerator.generate(meeting, prep);
      feed.push({
        id: meeting.id,
        type: 'EVENT',
        author: meeting.author || { full_name: 'Sistema' },
        created_at: meeting.created_at,
        content: {
          event: meeting,
          preparation: prep,
          pendingTasks
        }
      });
    });

    // 2. Add Notices to Feed
    notices.forEach(notice => {
      feed.push({
        id: notice.id,
        type: 'NOTICE',
        author: notice.author || { full_name: 'Líder' },
        created_at: notice.created_at,
        content: notice
      });
    });

    // 3. Add Prayers to Feed
    prayers.forEach(prayer => {
      feed.push({
        id: prayer.id,
        type: 'PRAYER',
        author: prayer.author || { full_name: 'Membro' },
        created_at: prayer.created_at,
        content: prayer.metadata?.requests || []
      });
    });

    // Sort feed chronologically (newest first)
    // Wait, for events, they are usually in the future. We want the NEXT events first, or newest created?
    // A feed typically sorts by created_at DESC. Let's do created_at DESC.
    feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      group,
      permissions: {}, 
      dashboard: {
        summary: {
          stats: { 
            members: Math.max(1, (group as any).church_members?.[0]?.count || 0), 
            visitors: 0, 
            meetingsThisMonth: allMeetings.length 
          },
          health: { score: 100, growth: 0, attendance: 100 }
        },
        feed
      },
      quickActions: [
        { id: 'schedule', title: 'Agendar', icon: 'plus' },
        { id: 'scale', title: 'Escala Geral', icon: 'calendar' }
      ]
    };
  }
}
