export type MediaType = 'image' | 'video' | 'audio' | 'text';

export interface Story {
  id: string;
  author_id: string;
  media_url: string | null;
  media_type: MediaType;
  content: string | null;
  background_color: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;          // segundos (só video/audio)
  expires_at: string;                // ISO
  is_highlight?: boolean;
  highlight_title?: string | null;
  highlight_cover_url?: string | null;
  created_at: string;
  author?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
}

export interface StoryGroup {
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  stories: Story[];
  allViewed: boolean;
  is_live?: boolean;
  latest_at?: string;
}

export interface StoryView {
  story_id: string;
  viewer_id: string;
  viewed_at: string;
}

export interface StoryLike {
  story_id: string;
  user_id: string;
  created_at: string;
}

export interface CreateStoryPayload {
  media_type: MediaType;
  media_url?: string | null;
  content?: string | null;
  background_color?: string | null;
  duration?: number | null;
  blob?: Blob | File | null;
}
