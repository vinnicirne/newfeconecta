export interface EventItemCommitment {
  id: string;
  item_id: string;
  user_id: string;
  quantity: number;
  created_at: string;
  profiles?: { full_name: string; username: string; avatar_url: string | null };
}

export interface EventItem {
  id: string;
  event_id: string;
  category: string;
  name: string;
  needed_quantity: number;
  unit: string;
  created_at: string;
  commitments?: EventItemCommitment[];
  total_committed?: number;
  my_commitment?: number;
}

export interface EventItemDto {
  category: string;
  name: string;
  needed_quantity: number;
  unit?: string;
}

export interface FeEvent {
  id: string;
  author_id: string;
  church_id?: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  location: string | null;
  online_link: string | null;
  starts_at: string;
  ends_at: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // joins opcionais
  profiles?: { full_name: string; avatar_url: string | null; username: string };
  churches?: { id: string; name: string; slug: string; logo_url: string | null } | null;
  attendees_count?: number;
  my_rsvp?: RSVPStatus | null;
  items?: EventItem[];
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: RSVPStatus;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null; username: string };
}

export interface CreateEventDto {
  title: string;
  description?: string;
  church_id?: string | null;
  cover_url?: string;
  location?: string;
  online_link?: string;
  starts_at: string;
  ends_at?: string;
  is_public: boolean;
  items?: EventItemDto[];
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  church_id?: string | null;
  cover_url?: string;
  location?: string;
  online_link?: string;
  starts_at?: string;
  ends_at?: string;
  is_public?: boolean;
}
