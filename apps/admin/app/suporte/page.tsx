"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle, Send, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const SUBJECT_OPTIONS = [
  "Bug / Erro no sistema",
  "Problema com login ou conta",
  "Erro em publicação ou post",
  "Problema com áudio ou vídeo",
  "Erro de carregamento ou lentidão",
  "Sugestão de melhoria",
  "Outro",
];

export default function SuportePage() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAuthUser(user);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || message.trim().length < 10) {
      toast.error("Descreva o problema com pelo menos 10 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message: message.trim(),
          userEmail: authUser?.email ?? "Não identificado",
          userName:
            authUser?.user_metadata?.full_name ||
            authUser?.user_metadata?.name ||
            authUser?.email ||
            "Usuário anônimo",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar relato.");
      }

      setSuccess(true);
      setMessage("");
      setSubject(SUBJECT_OPTIONS[0]);
      toast.success("Relato enviado! Nossa equipe analisará em breve.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center text-center gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-whatsapp-green/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-whatsapp-green" />
        </div>
        <div>
          <h2 className="text-2xl font-bold dark:text-white mb-2">Relato enviado!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
            Nossa equipe receberá seu relato por e-mail e entrará em contato se necessário.
            Obrigado por nos ajudar a melhorar o FéConecta!
          </p>
        </div>
        <button
          onClick={() => setSuccess(false)}
          className="px-6 py-2.5 rounded-xl bg-whatsapp-green text-white text-sm font-semibold hover:opacity-90 transition"
        >
          Enviar outro relato
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-xl mx-auto px-4 pt-10 pb-24 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-whatsapp-green" />
            Reportar Problema
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Encontrou um bug, erro ou tem uma sugestão? Descreva aqui — nossa equipe receberá um e-mail imediatamente.
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 p-6 space-y-5"
        >
          {/* Usuário identificado */}
          {authUser && (
            <div className="flex items-center gap-3 bg-whatsapp-green/5 dark:bg-whatsapp-green/10 border border-whatsapp-green/20 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-whatsapp-green/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-whatsapp-green uppercase">
                  {(authUser?.user_metadata?.full_name || authUser?.email || "?").charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Enviando como</p>
                <p className="text-sm font-semibold dark:text-white truncate">
                  {authUser?.user_metadata?.full_name || "Usuário"}{" "}
                  <span className="font-normal text-gray-400">({authUser?.email})</span>
                </p>
              </div>
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold dark:text-white">
              Categoria do problema
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 transition"
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold dark:text-white">
              Descreva o problema <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              placeholder="Ex: Ao tentar publicar um post com vídeo, a tela trava e o upload não termina. Isso acontece no Chrome no Android..."
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 py-3 text-sm dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 transition resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{message.length} caracteres</p>
          </div>

          {/* Dica */}
          <div className="flex gap-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Inclua: hora do erro, página onde ocorreu, navegador/dispositivo utilizado. Isso ajuda nossa equipe a resolver mais rápido.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full flex items-center justify-center gap-2 bg-whatsapp-green hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando relato...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Relato
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
