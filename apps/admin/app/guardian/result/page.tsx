"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

function GuardianResultContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const name = params.get("name") ? decodeURIComponent(params.get("name")!) : "seu filho(a)";

  const states: Record<string, { icon: React.ReactNode; title: string; message: string; color: string }> = {
    approved: {
      icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
      title: "Autorização Concedida! ✅",
      message: `A conta de ${name} no FéConecta foi aprovada com sucesso. Agora ele(a) já pode acessar a plataforma livremente.`,
      color: "text-green-600",
    },
    already_approved: {
      icon: <CheckCircle2 className="w-16 h-16 text-blue-500" />,
      title: "Conta já aprovada",
      message: `A conta de ${name} já estava aprovada anteriormente. Nenhuma ação foi necessária.`,
      color: "text-blue-600",
    },
    expired: {
      icon: <Clock className="w-16 h-16 text-amber-500" />,
      title: "Link expirado",
      message: "Este link de autorização expirou (válido por 7 dias). Peça para seu filho(a) fazer um novo cadastro para receber um novo link.",
      color: "text-amber-600",
    },
    invalid: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      title: "Link inválido",
      message: "Este link de autorização é inválido ou já foi utilizado. Caso precise de ajuda, entre em contato com o suporte do FéConecta.",
      color: "text-red-600",
    },
    error: {
      icon: <AlertTriangle className="w-16 h-16 text-red-500" />,
      title: "Erro ao processar",
      message: "Houve um erro ao processar sua autorização. Por favor, tente novamente ou entre em contato com o suporte.",
      color: "text-red-600",
    },
  };

  const state = states[status ?? "invalid"] ?? states["invalid"];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full flex flex-col items-center text-center gap-5">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center shadow-lg mb-2">
          <span className="text-2xl">🔥</span>
        </div>

        {state.icon}

        <h1 className={`text-2xl font-black ${state.color}`}>{state.title}</h1>
        <p className="text-gray-600 text-sm leading-relaxed">{state.message}</p>

        {status === "approved" && (
          <div className="mt-2 p-4 rounded-2xl bg-green-50 border border-green-100 text-left w-full">
            <p className="text-green-700 text-xs font-bold mb-1">✅ O que foi autorizado:</p>
            <ul className="text-green-600 text-xs space-y-1 list-disc list-inside">
              <li>Acesso ao feed de notícias e testemunhos cristãos</li>
              <li>Audição de músicas gospel no FéMusic</li>
              <li>Participação em salas de oração</li>
              <li>Interações com a comunidade de fé</li>
            </ul>
          </div>
        )}

        <p className="text-gray-400 text-[11px] leading-relaxed mt-2">
          FéConecta · Conectando vidas pela Fé<br />
          Conforme a LGPD (Lei 13.709/2018), Art. 14
        </p>

        <Link
          href="/"
          className="mt-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl text-sm transition-all"
        >
          Conhecer o FéConecta
        </Link>
      </div>
    </div>
  );
}

export default function GuardianResultPage() {
  return (
    <Suspense>
      <GuardianResultContent />
    </Suspense>
  );
}
