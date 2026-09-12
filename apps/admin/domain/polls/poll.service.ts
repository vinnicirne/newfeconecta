// =============================================================================
// FéConecta — Domínio Polls / Enquetes
// Service: operações de banco usando service role
// =============================================================================
import { createClient } from "@supabase/supabase-js";
import type { Poll, PollOption, PollResult, CreatePollDto } from "./types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ---------------------------------------------------------------------------
// Método privado: calcula resultados de uma enquete
// ---------------------------------------------------------------------------
async function computeResults(
  pollId: string,
  options: PollOption[]
): Promise<{ results: PollResult[]; total_votes: number }> {
  const { data: votes, error } = await supabaseAdmin
    .from("poll_votes")
    .select("option_ids")
    .eq("poll_id", pollId);

  if (error) throw new Error(error.message);

  // Conta votos por opção
  const countMap: Record<string, number> = {};
  for (const opt of options) countMap[opt.id] = 0;

  let totalVoters = 0;
  for (const vote of votes ?? []) {
    totalVoters++;
    const optionIds: string[] = Array.isArray(vote.option_ids) ? vote.option_ids : [];
    for (const oid of optionIds) {
      if (countMap[oid] !== undefined) countMap[oid]++;
    }
  }

  // Conta total de seleções (pode diferir de totalVoters em múltipla escolha)
  const totalSelections = Object.values(countMap).reduce((s, c) => s + c, 0);

  const results: PollResult[] = options.map((opt) => ({
    option_id: opt.id,
    option_text: opt.text,
    count: countMap[opt.id] ?? 0,
    percentage:
      totalSelections > 0
        ? Math.round(((countMap[opt.id] ?? 0) / totalSelections) * 100)
        : 0,
  }));

  return { results, total_votes: totalVoters };
}

// ---------------------------------------------------------------------------
// createPoll
// ---------------------------------------------------------------------------
export async function createPoll(
  authorId: string,
  dto: CreatePollDto
): Promise<Poll> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("polls")
    .insert({
      author_id: authorId,
      question: dto.question,
      options: dto.options,
      allow_multiple: dto.allow_multiple,
      is_public: dto.is_public,
      expires_at: expiresAt,
    })
    .select("*, profiles(full_name, avatar_url, username)")
    .single();

  if (error) throw new Error(error.message);
  return data as Poll;
}

// ---------------------------------------------------------------------------
// listPolls
// ---------------------------------------------------------------------------
export async function listPolls(
  filters?: { author_id?: string }
): Promise<Poll[]> {
  let query = supabaseAdmin
    .from("polls")
    .select("*, profiles(full_name, avatar_url, username)")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (filters?.author_id) {
    query = query.eq("author_id", filters.author_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const polls = data as Poll[];

  // Enriquecer com resultados
  const enriched = await Promise.all(
    polls.map(async (poll) => {
      const { results, total_votes } = await computeResults(
        poll.id,
        poll.options
      );
      return { ...poll, results, total_votes };
    })
  );

  return enriched;
}

// ---------------------------------------------------------------------------
// getPollById
// ---------------------------------------------------------------------------
export async function getPollById(
  id: string,
  userId?: string
): Promise<Poll | null> {
  const { data, error } = await supabaseAdmin
    .from("polls")
    .select("*, profiles(full_name, avatar_url, username)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const poll = data as Poll;
  const { results, total_votes } = await computeResults(poll.id, poll.options);
  poll.results = results;
  poll.total_votes = total_votes;

  if (userId) {
    const { data: voteRow } = await supabaseAdmin
      .from("poll_votes")
      .select("option_ids")
      .eq("poll_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    poll.my_vote = voteRow
      ? (voteRow.option_ids as string[])
      : [];
  }

  return poll;
}

// ---------------------------------------------------------------------------
// vote
// ---------------------------------------------------------------------------
export async function vote(
  pollId: string,
  userId: string,
  optionIds: string[]
): Promise<Poll> {
  const { error } = await supabaseAdmin.from("poll_votes").upsert(
    { poll_id: pollId, user_id: userId, option_ids: optionIds },
    { onConflict: "poll_id,user_id" }
  );

  if (error) throw new Error(error.message);

  const updated = await getPollById(pollId, userId);
  if (!updated) throw new Error("Poll não encontrado após votação");
  return updated;
}

// ---------------------------------------------------------------------------
// deletePoll
// ---------------------------------------------------------------------------
export async function deletePoll(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("polls").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
