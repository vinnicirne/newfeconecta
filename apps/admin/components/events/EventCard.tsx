"use client";

import { useState } from "react";
import moment from "moment";
import "moment/locale/pt-br";
import { MapPin, Link2, Users, Globe, Lock, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeEvent, RSVPStatus } from "@/domain/events/types";

moment.locale("pt-br");

interface EventCardProps {
  event: FeEvent;
  currentUserId: string | null;
  onRSVP: (id: string, status: RSVPStatus) => void;
}

const RSVP_BUTTONS: { status: RSVPStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  {
    status: "going",
    label: "Vou",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    activeClass: "bg-emerald-500 text-white border-emerald-500",
  },
  {
    status: "maybe",
    label: "Talvez",
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    activeClass: "bg-amber-500 text-white border-amber-500",
  },
  {
    status: "not_going",
    label: "Nao",
    icon: <XCircle className="w-3.5 h-3.5" />,
    activeClass: "bg-red-500 text-white border-red-500",
  },
];

export default function EventCard({ event, currentUserId, onRSVP }: EventCardProps) {
  const [optimisticRsvp, setOptimisticRsvp] = useState<RSVPStatus | null | undefined>(event.my_rsvp);
  const [optimisticCount, setOptimisticCount] = useState<number>(event.attendees_count ?? 0);

  function handleRSVP(status: RSVPStatus) {
    if (!currentUserId) return;

    const prev = optimisticRsvp;
    const prevCount = optimisticCount;

    // Atualiza otimisticamente
    setOptimisticRsvp(status);
    if (status === "going" && prev !== "going") setOptimisticCount((c) => c + 1);
    if (status !== "going" && prev === "going") setOptimisticCount((c) => Math.max(0, c - 1));

    onRSVP(event.id, status);
  }

  const coverGradient = "bg-gradient-to-br from-whatsapp-teal/40 to-emerald-700/40";

  return (
    <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Foto de capa */}
      <div className="relative aspect-video w-full">
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center", coverGradient)}>
            <span className="text-4xl opacity-30">🎉</span>
          </div>
        )}

        {/* Badge público/privado */}
        <div className="absolute top-2 left-2">
          {event.is_public ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm">
              <Globe className="w-3 h-3" /> Público
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm">
              <Lock className="w-3 h-3" /> Privado
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {event.title}
        </h3>

        {/* Data */}
        <p className="text-xs text-whatsapp-teal font-semibold">
          {moment(event.starts_at).format("ddd, D [de] MMM [às] HH:mm")}
        </p>

        {/* Local */}
        {event.location && (
          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
            <MapPin className="w-3 h-3 shrink-0" /> {event.location}
          </p>
        )}

        {/* Link online */}
        {event.online_link && (
          <a
            href={event.online_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-500 truncate hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 className="w-3 h-3 shrink-0" /> Evento online
          </a>
        )}

        {/* Contagem */}
        <p className="flex items-center gap-1 text-xs text-gray-400">
          <Users className="w-3 h-3" /> {optimisticCount} confirmado{optimisticCount !== 1 ? "s" : ""}
        </p>

        {/* RSVP buttons */}
        {currentUserId && (
          <div className="flex gap-1.5 mt-auto pt-2 border-t border-gray-100 dark:border-white/5">
            {RSVP_BUTTONS.map(({ status, label, icon, activeClass }) => (
              <button
                key={status}
                onClick={() => handleRSVP(status)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
                  optimisticRsvp === status
                    ? activeClass
                    : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-whatsapp-teal hover:text-whatsapp-teal"
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}