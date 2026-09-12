export type RSVPStatus = 'going' | 'maybe' | 'not_going';

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
