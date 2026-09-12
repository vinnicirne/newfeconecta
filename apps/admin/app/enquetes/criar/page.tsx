"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart2 } from "lucide-react";
import PollForm from "@/components/polls/PollForm";
import { CreatePollDto } from "@/domain/polls/types";
import { toast } from "sonner";
import BottomNav from "@/components/feed/BottomNav";

export default function CreatePollPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (dto: CreatePollDto) => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar enquete");
      }

      toast.success("Enquete criada com sucesso!");
      router.push("/enquetes");
    } catch (err: any) {
      toast.error(err.message || "Falha ao criar enquete.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-24">
      {/* Top Header */}
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
              Criar Nova Enquete
            </h1>
            <p className="text-[11px] text-gray-400 font-medium">
              Faça uma pergunta e receba a opinião da igreja
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <div className="bg-white dark:bg-[#0c0c0c] border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <PollForm onSubmit={handleSubmit} isSaving={isSaving} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
