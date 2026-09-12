// =============================================================================
// FeConecta - Dominio Eventos
// EventService - CRUD de eventos + RSVP
//
// SQL para executar no Supabase Dashboard (SQL Editor):
// --------------------------------------------------------------------------
// -- Tabela de eventos
// CREATE TABLE IF NOT EXISTS events (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   title       TEXT NOT NULL,
//   description TEXT,
//   cover_url   TEXT,
//   location    TEXT,
//   online_link TEXT,
//   starts_at   TIMESTAMPTZ NOT NULL,
//   ends_at     TIMESTAMPTZ,
//   is_public   BOOLEAN NOT NULL DEFAULT TRUE,
//   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//   updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// -- Tabela de participantes / RSVP
// CREATE TABLE IF NOT EXISTS event_attendees (
//   id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
//   user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   status     TEXT NOT NULL CHECK (status IN ('going','maybe','not_going')),
//   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//   UNIQUE (event_id, user_id)
// );
//
// -- Trigger para updated_at automatico
// CREATE OR REPLACE FUNCTION update_updated_at_column()
// RETURNS TRIGGER AS $$
// BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
// $$ LANGUAGE plpgsql;
//
// CREATE TRIGGER events_updated_at
//   BEFORE UPDATE ON events
//   FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
//
// -- Indices de performance
// CREATE INDEX IF NOT EXISTS idx_events_starts_at  ON events (starts_at ASC);
// CREATE INDEX IF NOT EXISTS idx_events_author_id  ON events (author_id);
// CREATE INDEX IF NOT EXISTS idx_attendees_event   ON event_attendees (event_id);
// CREATE INDEX IF NOT EXISTS idx_attendees_user    ON event_attendees (user_id);
//
// -- RLS basica (ajuste conforme politica do projeto)
// ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
// ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "Public events are viewable by everyone"
//   ON events FOR SELECT USING (is_public = true OR auth.uid() = author_id);
//
// CREATE POLICY "Authors can insert events"
//   ON events FOR INSERT WITH CHECK (auth.uid() = author_id);
//
// CREATE POLICY "Authors can update their events"
//   ON events FOR UPDATE USING (auth.uid() = author_id);
//
// CREATE POLICY "Authors can delete their events"
//   ON events FOR DELETE USING (auth.uid() = author_id);
//
// CREATE POLICY "Attendees are viewable by anyone"
//   ON event_attendees FOR SELECT USING (true);
//
// CREATE POLICY "Users manage their own RSVP"
//   ON event_attendees FOR ALL USING (auth.uid() = user_id);
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  FeEvent,
  EventAttendee,
  CreateEventDto,
  UpdateEventDto,
  RSVPStatus,
} from "./types";

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export class EventService {
  private db: SupabaseClient;

  constructor() {
    this.db = getAdminClient();
  }

  async createEvent(authorId: string, dto: CreateEventDto): Promise<FeEvent> {
    const { data, error } = await this.db
      .from("events")
      .insert({
        author_id: authorId,
        church_id: dto.church_id ?? null,
        title: dto.title,
        description: dto.description ?? null,
        cover_url: dto.cover_url ?? null,
        location: dto.location ?? null,
        online_link: dto.online_link ?? null,
        starts_at: dto.starts_at,
        ends_at: dto.ends_at ?? null,
        is_public: dto.is_public,
      })
      .select("*, profiles:author_id ( full_name, avatar_url, username ), churches:church_id ( id, name, slug, logo_url )")
      .single();

    if (error) throw new Error(error.message);

    // Salva itens da lista de contribuição se fornecidos
    if (dto.items && dto.items.length > 0) {
      try {
        const itemsToInsert = dto.items.map((i) => ({
          event_id: data.id,
          category: i.category || "Geral",
          name: i.name,
          needed_quantity: i.needed_quantity || 1,
          unit: i.unit || "unidade",
        }));
        await this.db.from("event_items").insert(itemsToInsert);
      } catch (itemErr) {
        console.error("Erro ao salvar itens do evento:", itemErr);
      }
    }

    // Se promovido por uma Igreja, publica automaticamente no feed da Igreja
    if (dto.church_id) {
      try {
        await this.db.from("church_posts").insert({
          church_id: dto.church_id,
          author_id: authorId,
          content: `📅 **Novo Evento Anunciado!**\n\n**${dto.title}**\n${dto.description || ""}`,
          media_url: dto.cover_url || null,
        });
      } catch (postErr) {
        console.error("Erro ao criar post automatico da igreja para o evento:", postErr);
      }
    }

    // Processa menções de usuários (@username) na descrição do evento
    if (dto.description) {
      try {
        const { NotificationService } = await import("@/lib/notifications");
        await NotificationService.parseMentions(dto.description, authorId);
      } catch (mentionErr) {
        console.error("Erro ao notificar mencoes de evento:", mentionErr);
      }
    }

    return data as unknown as FeEvent;
  }

  async listEvents(filters?: {
    is_public?: boolean;
    author_id?: string;
    church_id?: string;
  }): Promise<FeEvent[]> {
    let query = this.db
      .from("events")
      .select("*, profiles:author_id ( full_name, avatar_url, username ), churches:church_id ( id, name, slug, logo_url )")
      .order("starts_at", { ascending: true });

    if (filters?.is_public !== undefined) {
      query = query.eq("is_public", filters.is_public);
    }
    if (filters?.author_id) {
      query = query.eq("author_id", filters.author_id);
    }
    if (filters?.church_id) {
      query = query.eq("church_id", filters.church_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FeEvent[];
  }

  async getEventById(id: string, userId?: string): Promise<FeEvent | null> {
    const { data, error } = await this.db
      .from("events")
      .select("*, profiles:author_id ( full_name, avatar_url, username ), churches:church_id ( id, name, slug, logo_url )")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const { count: attendeesCount } = await this.db
      .from("event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .in("status", ["going", "maybe"]);

    // Carrega itens de contribuição com compromissos
    const { data: rawItems } = await this.db
      .from("event_items")
      .select("*, commitments:event_item_commitments(*, profiles:user_id(full_name, username, avatar_url))")
      .eq("event_id", id);

    const items = (rawItems || []).map((item: any) => {
      const commitments = item.commitments || [];
      const totalCommitted = commitments.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
      const myCommitment = userId ? commitments.find((c: any) => c.user_id === userId)?.quantity || 0 : 0;
      return {
        ...item,
        commitments,
        total_committed: totalCommitted,
        my_commitment: myCommitment,
      };
    });

    return { ...data, attendees_count: attendeesCount ?? 0, items } as unknown as FeEvent;
  }

  async setItemCommitment(itemId: string, userId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.db
        .from("event_item_commitments")
        .delete()
        .eq("item_id", itemId)
        .eq("user_id", userId);
    } else {
      await this.db
        .from("event_item_commitments")
        .upsert(
          { item_id: itemId, user_id: userId, quantity },
          { onConflict: "item_id,user_id" }
        );
    }
  }

  async updateEvent(id: string, updates: UpdateEventDto): Promise<FeEvent> {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined)       payload.title       = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.cover_url !== undefined)   payload.cover_url   = updates.cover_url;
    if (updates.location !== undefined)    payload.location    = updates.location;
    if (updates.online_link !== undefined) payload.online_link = updates.online_link;
    if (updates.starts_at !== undefined)   payload.starts_at   = updates.starts_at;
    if (updates.ends_at !== undefined)     payload.ends_at     = updates.ends_at;
    if (updates.is_public !== undefined)   payload.is_public   = updates.is_public;

    const { data, error } = await this.db
      .from("events")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as FeEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.db.from("events").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async setRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<EventAttendee> {
    const { data, error } = await this.db
      .from("event_attendees")
      .upsert(
        { event_id: eventId, user_id: userId, status },
        { onConflict: "event_id,user_id" }
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as EventAttendee;
  }

  async getAttendees(eventId: string): Promise<EventAttendee[]> {
    const { data, error } = await this.db
      .from("event_attendees")
      .select("*, profiles:user_id ( full_name, avatar_url, username )")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EventAttendee[];
  }

  async getUserRSVP(eventId: string, userId: string): Promise<RSVPStatus | null> {
    const { data } = await this.db
      .from("event_attendees")
      .select("status")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();

    return (data?.status as RSVPStatus) ?? null;
  }
}