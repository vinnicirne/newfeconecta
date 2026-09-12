"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BarChart2, Loader2 } from "lucide-react";
import { Poll } from "@/domain/polls/types";
import PollCard from "@/components/polls/PollCard";
import BottomNav from "@/components/feed/BottomNav";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      loadPoll();
    }
    if (id) init();
  }, [id]);

  async function loadPoll() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/polls/${id}`);
      if (!res.ok) throw new Error("Erro ao carregar enquete");
      const data = await res.json();
      setPoll(data);
    } catch (err: any) {
      toast.error(err.message || "Falha ao buscar detalhes da enquete.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async (pollId: string) => {
    if (!confirm("Deseja realmente excluir esta enquete?")) return;

    try {
      const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir enquete");

      toast.success("Enquete excluída!");
      router.push("/enquetes");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir enquete.");
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#080808]/90 backdrop-blur-md border-b border-white/10 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/enquetes"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-whatsapp-teal" />
              Detalhes da Enquete
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-whatsapp-teal" />
            <span className="text-xs font-bold">Carregando detalhes...</span>
          </div>
        ) : !poll ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-3">
            <h3 className="text-sm font-bold text-white">Enquete não encontrada</h3>
            <Link
              href="/enquetes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-whatsapp-teal text-white text-xs font-bold"
            >
              Voltar para a lista
            </Link>
          </div>
        ) : (
          <PollCard
            poll={poll}
            currentUserId={currentUserId}
            onVoted={(updated) => setPoll(updated)}
            onDelete={handleDelete}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
