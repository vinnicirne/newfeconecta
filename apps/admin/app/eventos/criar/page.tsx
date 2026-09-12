"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import EventForm from "@/components/events/EventForm";
import type { CreateEventDto } from "@/domain/events/types";

export default function CriarEventoPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(dto: CreateEventDto) {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Voce precisa estar logado para criar eventos");
        return;
      }
      const res = await fetch("/api/fe-eventos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(dto),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar evento");
      toast.success("Evento criado com sucesso!");
      const eventId = json.id || json.event?.id;
      if (!eventId) throw new Error("ID do evento não retornado");
      router.push(`/eventos/${eventId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar evento");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-whatsapp-light dark:bg-whatsapp-dark">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/eventos"
            className="p-2 rounded-xl bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-whatsapp-teal transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Novo Evento</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Preencha os dados do seu evento</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-sm">
          <EventForm onSubmit={handleSubmit} isSaving={isSaving} />
        </div>
      </div>
    </div>
  );
}