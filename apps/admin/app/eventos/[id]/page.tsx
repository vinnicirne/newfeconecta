"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";
import {
  ArrowLeft, MapPin, Link2, Users, Globe, Lock,
  Edit3, Trash2, CheckCircle2, HelpCircle, XCircle, Loader2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import EventForm from "@/components/events/EventForm";
import type { FeEvent, EventAttendee, RSVPStatus, UpdateEventDto } from "@/domain/events/types";

moment.locale("pt-br");

const RSVP_OPTIONS: { status: RSVPStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { status: "going",     label: "Vou",    icon: <CheckCircle2 className="w-5 h-5" />, activeClass: "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" },
  { status: "maybe",    label: "Talvez", icon: <HelpCircle className="w-5 h-5" />,    activeClass: "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" },
  { status: "not_going",label: "Nao Vou",icon: <XCircle className="w-5 h-5" />,       activeClass: "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20" },
];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<FeEvent | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRsvp, setMyRsvp] = useState<RSVPStatus | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/fe-eventos/${id}`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar evento");
      setEvent(json.event);
      setAttendees(json.attendees ?? []);
      setMyRsvp(json.event.my_rsvp ?? null);
    } catch (err) {
      toast.error("Nao foi possivel carregar o evento");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  async function handleRSVP(status: RSVPStatus) {
    if (!currentUserId) { toast.error("Faca login para confirmar presenca"); return; }
    setRsvpLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/fe-eventos/${id}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      const wasGoing = myRsvp === "going";
      const nowGoing = status === "going";
      setMyRsvp(status);
      setEvent((e) => e ? {
        ...e,
        attendees_count: (e.attendees_count ?? 0) + (nowGoing && !wasGoing ? 1 : !nowGoing && wasGoing ? -1 : 0),
      } : e);
    } catch (err) {
      toast.error("Erro ao registrar presenca");
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Deseja excluir este evento? Esta acao nao pode ser desfeita.")) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/fe-eventos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      toast.success("Evento excluido");
      router.push("/eventos");
    } catch (err) {
      toast.error("Erro ao excluir evento");
      setDeleting(false);
    }
  }

  async function handleEdit(dto: UpdateEventDto) {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/fe-eventos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify(dto),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setEvent((e) => (e ? { ...e, ...json.event } : e));
      setShowEditModal(false);
      toast.success("Evento atualizado!");
    } catch (err) {
      toast.error("Erro ao atualizar evento");
    } finally {
      setIsSaving(false);
    }
  }

  const goingCount = attendees.filter((a) => a.status === "going").length;
  const maybeCount = attendees.filter((a) => a.status === "maybe").length;
  const isAuthor = event?.author_id === currentUserId;

  if (loading) {
    return (
      <div className="min-h-screen bg-whatsapp-light dark:bg-whatsapp-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-whatsapp-teal animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-whatsapp-light dark:bg-whatsapp-dark flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 font-bold">Evento nao encontrado</p>
        <Link href="/eventos" className="text-whatsapp-teal text-sm font-bold hover:underline">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whatsapp-light dark:bg-whatsapp-dark">
      <div className="max-w-2xl mx-auto pb-20">
        {/* Back */}
        <div className="sticky top-0 z-10 bg-whatsapp-light/80 dark:bg-whatsapp-dark/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <Link href="/eventos" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-whatsapp-teal transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold text-sm">Eventos</span>
          </Link>
          {isAuthor && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-whatsapp-teal transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm font-bold text-red-500 hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
            </div>
          )}
        </div>

        {/* Capa */}
        {event.cover_url ? (
          <div className="w-full max-h-64 overflow-hidden">
            <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-whatsapp-teal/30 to-emerald-700/30 flex items-center justify-center">
            <span className="text-6xl opacity-30">🎉</span>
          </div>
        )}

        {/* Conteudo */}
        <div className="px-4 py-6 space-y-5">
          {/* Titulo e badge */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{event.title}</h1>
            {event.is_public ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-500/20 whitespace-nowrap">
                <Globe className="w-3 h-3" /> Publico
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-500/20 whitespace-nowrap">
                <Lock className="w-3 h-3" /> Privado
              </span>
            )}
          </div>

          {/* Promotor / Criador */}
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/10">
            {event.churches ? (
              <Link href={`/igreja/${event.churches.slug}`} className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold overflow-hidden shrink-0">
                  {event.churches.logo_url ? (
                    <img src={event.churches.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    "⛪"
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline truncate">
                    Promovido por {event.churches.name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Criado por @{event.profiles?.username || "usuario"}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal font-bold overflow-hidden shrink-0">
                  {event.profiles?.avatar_url ? (
                    <img src={event.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    "👤"
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Organizado por {event.profiles?.full_name || `@${event.profiles?.username}`}
                  </span>
                  <span className="text-[10px] text-gray-400">Evento Pessoal</span>
                </div>
              </div>
            )}
          </div>

          {/* Descricao */}
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Infos */}
          <div className="space-y-2.5 p-4 bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-whatsapp-teal font-semibold">
                {moment(event.starts_at).format("dddd, D [de] MMMM [de] YYYY [as] HH:mm")}
              </span>
            </div>
            {event.ends_at && (
              <div className="text-xs text-gray-400">
                ate {moment(event.ends_at).format("D [de] MMMM [as] HH:mm")}
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" /> {event.location}
              </div>
            )}
            {event.online_link && (
              <a
                href={event.online_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
              >
                <Link2 className="w-4 h-4 shrink-0" /> Acessar evento online
              </a>
            )}
          </div>

          {/* Contagem */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {goingCount} confirmado{goingCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <HelpCircle className="w-4 h-4 text-amber-500" /> {maybeCount} talvez
            </span>
          </div>

          {/* RSVP grande */}
          {currentUserId && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sua presenca</p>
              <div className="flex gap-2">
                {RSVP_OPTIONS.map(({ status, label, icon, activeClass }) => (
                  <button
                    key={status}
                    onClick={() => handleRSVP(status)}
                    disabled={rsvpLoading}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-bold border-2 transition-all active:scale-95 disabled:opacity-60",
                      myRsvp === status
                        ? activeClass
                        : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 bg-white dark:bg-whatsapp-darkLighter hover:border-whatsapp-teal hover:text-whatsapp-teal"
                    )}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de confirmados */}
          {attendees.filter((a) => a.status === "going").length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Confirmados
              </p>
              <div className="flex flex-wrap gap-2">
                {attendees
                  .filter((a) => a.status === "going")
                  .map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-whatsapp-darkLighter rounded-full border border-gray-100 dark:border-white/10">
                      {a.profiles?.avatar_url ? (
                        <img
                          src={a.profiles.avatar_url}
                          alt={a.profiles.full_name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-whatsapp-teal/20 flex items-center justify-center text-[9px] font-bold text-whatsapp-teal">
                          {a.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {a.profiles?.full_name ?? "Usuario"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edicao */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-whatsapp-dark rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Editar Evento</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <EventForm
              initialData={{
                title: event.title,
                description: event.description ?? undefined,
                cover_url: event.cover_url ?? undefined,
                location: event.location ?? undefined,
                online_link: event.online_link ?? undefined,
                starts_at: event.starts_at,
                ends_at: event.ends_at ?? undefined,
                is_public: event.is_public,
              }}
              onSubmit={handleEdit}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}
    </div>
  );
}