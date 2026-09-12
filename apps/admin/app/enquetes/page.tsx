"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, BarChart2, Filter, Loader2, ArrowLeft } from "lucide-react";
import { Poll } from "@/domain/polls/types";
import PollCard from "@/components/polls/PollCard";
import BottomNav from "@/components/feed/BottomNav";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import moment from "moment";

export default function PollsListPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ativas" | "encerradas" | "minhas">("ativas");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      loadPolls();
    }
    init();
  }, []);

  async function loadPolls() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/polls");
      if (!res.ok) throw new Error("Erro ao carregar enquetes");
      const data = await res.json();
      setPolls(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Falha ao carregar enquetes.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeletePoll = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta enquete?")) return;

    try {
      const res = await fetch(`/api/polls/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir enquete");

      setPolls((prev) => prev.filter((p) => p.id !== id));
      toast.success("Enquete excluída!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir enquete.");
    }
  };

  const handlePollVoted = (updatedPoll: Poll) => {
    setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
  };

  const filteredPolls = polls.filter((p) => {
    const isExpired = moment().isAfter(moment(p.expires_at));
    if (filter === "ativas") return !isExpired;
    if (filter === "encerradas") return isExpired;
    if (filter === "minhas") return currentUserId && p.author_id === currentUserId;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#080808]/90 backdrop-blur-md border-b border-white/10 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-whatsapp-teal" />
                Enquetes da Comunidade
              </h1>
              <p className="text-[11px] text-gray-400 font-medium">
                Vote, opine e veja a voz da igreja em tempo real
              </p>
            </div>
          </div>

          <Link
            href="/enquetes/criar"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold text-xs shadow-md shadow-whatsapp-teal/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Criar Enquete</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Filtros */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "ativas", label: "🔥 Ativas" },
            { id: "encerradas", label: "⌛ Encerradas" },
            { id: "minhas", label: "👤 Minhas Enquetes" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === f.id
                  ? "bg-whatsapp-teal text-white shadow-md shadow-whatsapp-teal/20"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Listagem */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-whatsapp-teal" />
            <span className="text-xs font-bold">Carregando enquetes...</span>
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-3">
            <BarChart2 className="w-10 h-10 text-gray-500 mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-white">Nenhuma enquete encontrada</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {filter === "minhas"
                ? "Você ainda não criou nenhuma enquete."
                : "Não há enquetes disponíveis nesta categoria."}
            </p>
            <Link
              href="/enquetes/criar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-whatsapp-teal text-white text-xs font-bold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Criar a primeira</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                currentUserId={currentUserId}
                onVoted={handlePollVoted}
                onDelete={handleDeletePoll}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
