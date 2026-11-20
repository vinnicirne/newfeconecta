"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CalendarDays, Plus, List, Calendar, User, ArrowLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";
import EventCard from "@/components/events/EventCard";
import type { FeEvent, RSVPStatus } from "@/domain/events/types";

moment.locale("pt-br");

type FilterType = "todos" | "semana" | "meus";

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 animate-pulse">
      <div className="aspect-video bg-gray-200 dark:bg-white/10" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-lg w-1/2" />
        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-lg w-2/3" />
        <div className="flex gap-1.5 pt-2">
          <div className="flex-1 h-7 bg-gray-200 dark:bg-white/10 rounded-xl" />
          <div className="flex-1 h-7 bg-gray-200 dark:bg-white/10 rounded-xl" />
          <div className="flex-1 h-7 bg-gray-200 dark:bg-white/10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function EventosPage() {
  const [events, setEvents] = useState<FeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch("/api/fe-eventos", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar eventos");
      setEvents(Array.isArray(json) ? json : json.events ?? []);
    } catch (err) {
      setLoadError("Não foi possível carregar os eventos. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleRSVP(eventId: string, status: RSVPStatus) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const error = new Error("Faça login para confirmar presença");
        toast.error(error.message);
        throw error;
      }
      const res = await fetch(`/api/fe-eventos/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Não foi possível registrar sua presença"); }
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const wasGoing = e.my_rsvp === "going";
          const nowGoing = status === "going";
          return {
            ...e,
            my_rsvp: status,
            attendees_count: (e.attendees_count ?? 0) + (nowGoing && !wasGoing ? 1 : !nowGoing && wasGoing ? -1 : 0),
          };
        })
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar presença");
      throw err;
    }
  }

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredEvents = events.filter((e) => {
    if (filter === "meus" && e.author_id !== currentUserId) return false;
    if (filter === "semana") {
      const start = moment().startOf("isoWeek");
      const end = moment().endOf("isoWeek");
      if (!moment(e.starts_at).isBetween(start, end, undefined, "[]")) return false;
    }
    if (!normalizedSearch) return true;
    return [e.title, e.location, e.churches?.name, e.profiles?.username]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  });

  const FILTERS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "todos", label: "Todos", icon: <List className="w-4 h-4" /> },
    { key: "semana", label: "Esta Semana", icon: <Calendar className="w-4 h-4" /> },
    { key: "meus", label: "Meus Eventos", icon: <User className="w-4 h-4" /> },
  ];

  return (
    <main className="min-h-screen bg-whatsapp-light dark:bg-whatsapp-dark">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="relative mb-8 p-8 rounded-[32px] bg-gradient-to-br from-whatsapp-teal to-emerald-600 overflow-hidden shadow-2xl shadow-whatsapp-teal/20">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                aria-label="Voltar para o Feed"
                className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all active:scale-95 border border-white/20"
                title="Voltar para o Feed"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3">
                  <CalendarDays className="w-8 h-8" /> Eventos
                </h1>
                <p className="text-white/80 font-medium text-sm">Encontros, cultos e confraternizacoes</p>
              </div>
            </div>
            <Link
              href="/eventos/criar"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold text-sm rounded-2xl transition-all active:scale-95 border border-white/20"
            >
              <Plus className="w-4 h-4" /> Criar
            </Link>
          </div>
          <CalendarDays className="absolute -right-4 -top-4 w-32 h-32 text-white/10 rotate-12" />
        </div>

        <label className="flex items-center gap-3 px-4 mb-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-whatsapp-darkLighter focus-within:ring-2 focus-within:ring-whatsapp-teal/50">
          <Search className="w-5 h-5 text-gray-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            name="event-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nome, igreja ou local…"
            aria-label="Buscar eventos por nome, igreja ou local"
            className="w-full py-3 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
          />
        </label>

        {/* Filtros */}
        <div role="group" aria-label="Filtrar eventos" className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          {FILTERS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal",
                filter === key
                  ? "bg-whatsapp-teal border-whatsapp-teal text-white shadow-md shadow-whatsapp-teal/20"
                  : "bg-white dark:bg-whatsapp-darkLighter border-gray-100 dark:border-white/5 text-gray-500"
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : loadError ? (
          <div role="alert" className="py-16 flex flex-col items-center gap-4 rounded-[32px] border border-red-200 dark:border-red-500/20 bg-white/70 dark:bg-white/5 text-center px-6">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{loadError}</p>
            <button onClick={fetchEvents} className="px-5 py-2.5 rounded-xl bg-whatsapp-teal text-white text-sm font-bold hover:bg-whatsapp-tealLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal focus-visible:ring-offset-2">
              Tentar novamente
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-4 rounded-[40px] border border-dashed border-gray-200 dark:border-white/10 bg-white/30 dark:bg-white/5">
            <CalendarDays className="w-12 h-12 text-gray-300 dark:text-white/20" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm text-center">
              {normalizedSearch
                ? `Nenhum evento corresponde a “${searchQuery.trim()}”.`
                : filter === "semana" ? "Nenhum evento nesta semana." : filter === "meus" ? "Você ainda não criou eventos." : "Nenhum evento encontrado."}
            </p>
            <Link
              href="/eventos/criar"
              className="px-6 py-2.5 bg-whatsapp-teal text-white font-bold text-sm rounded-2xl hover:bg-whatsapp-tealLight transition-all"
            >
              Criar Evento
            </Link>
          </div>
        ) : (
          <div role="list" aria-label="Eventos disponíveis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <div key={event.id} role="listitem">
                <EventCard
                  event={event}
                  currentUserId={currentUserId}
                  onRSVP={handleRSVP}
                />
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
