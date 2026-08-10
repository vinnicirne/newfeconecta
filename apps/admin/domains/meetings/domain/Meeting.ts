export interface Meeting {
  id: string;
  reference_id: string;
  reference_type: string;
  church_id: string;
  title: string;
  event_date: string;
  event_time?: string;
  description?: string;
  metadata?: any;
  roles?: MeetingRole[];
  created_at: string;
  created_by?: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface MeetingRole {
  id: string;
  event_id: string;
  role_name: string;
  assigned_to?: string;
  assigned?: { full_name: string; id: string };
}

export interface MeetingQuery {
  groupId: string;
  groupType: string;
  from?: Date;
  to?: Date;
  includeRoles?: boolean;
}

export interface IMeetingRepository {
  query(params: MeetingQuery): Promise<Meeting[]>;
}
