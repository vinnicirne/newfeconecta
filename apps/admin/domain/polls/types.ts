// =============================================================================
// FéConecta — Domínio Polls / Enquetes
// Tipos compartilhados: entidades e DTOs
// =============================================================================

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  author_id: string;
  question: string;
  options: PollOption[];
  allow_multiple: boolean;
  expires_at: string;
  is_public: boolean;
  created_at: string;
  // joins opcionais
  profiles?: { full_name: string; avatar_url: string | null; username: string };
  total_votes?: number;
  results?: PollResult[];
  my_vote?: string[];
}

export interface PollResult {
  option_id: string;
  option_text: string;
  count: number;
  percentage: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_ids: string[];
  created_at: string;
}

export interface CreatePollDto {
  question: string;
  options: PollOption[];
  allow_multiple: boolean;
  is_public: boolean;
}
