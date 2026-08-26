"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Clock, Mail, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

function PendingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const guardianEmail = params.get("email") ? decodeURIComponent(params.get("email")!) : "";
  const [resending, setResending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Monitorar se a conta foi aprovada em tempo real (polling a cada 3 segundos)
  useEffect(() => {
    let isMounted = true;

    const checkApproval = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let query = supabase.from('profiles').select('guardian_approved').eq('is_minor', true);
        
        if (session?.user?.id) {
          query = query.eq('id', session.user.id);
        } else if (guardianEmail) {
          query = query.eq('guardian_email', guardianEmail.toLowerCase().trim()).order('created_at', { ascending: false }).limit(1);
        } else {
          return;
        }

        const { data, error } = await query.single();
        if (!error && data && data.guardian_approved === true) {
          if (isMounted) {
            setIsApproved(true);
            toast.success("Sua conta foi autorizada! Entrando na rede...");
            setTimeout(() => {
              router.push("/");
            }, 1500);
          }
        }
      } catch (_) {}
    };

    checkApproval();
    const interval = setInterval(checkApproval, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [guardianEmail, router]);

  const handleResend = async () => {
    if (!guardianEmail) {
      toast.error("E-mail do responsável não informado na página.");
      return;
    }

    setResending(true);
    try {
      const res = await fetch('/api/guardian/send-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_email: guardianEmail,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao reenviar e-mail");
      }

      setSentSuccess(true);
      toast.success("E-mail de autorização reenviado com sucesso! 📨");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível reenviar o e-mail.");
    } finally {
      setResending(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full flex flex-col items-center text-center gap-5">

        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center shadow-lg">
          <span className="text-2xl">🔥</span>
        </div>

        {/* Ícone de espera */}
        <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
        </div>

        <h1 className="text-2xl font-black text-gray-900">Aguardando autorização</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Sua conta foi criada com sucesso! 🎉 Mas por você ter menos de 18 anos,
          a lei brasileira exige que um responsável autorize seu acesso.
        </p>

        {/* Caixa de info do e-mail */}
        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-left">
          <Mail className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 text-sm font-bold">E-mail enviado para:</p>
            <p className="text-amber-700 text-sm font-mono mt-0.5 break-all">{guardianEmail}</p>
            <p className="text-amber-600 text-[11px] mt-2 leading-relaxed">
              Pedimos ao seu responsável para clicar no link de autorização que enviamos.
              O link é válido por <strong>7 dias</strong>.
            </p>
          </div>
        </div>

        {/* Passos */}
        <div className="w-full space-y-3 text-left">
          {[
            { n: "1", text: "Seu responsável recebe o e-mail do FéConecta" },
            { n: "2", text: "Ele(a) lê sobre a plataforma e clica em \"Autorizar\"" },
            { n: "3", text: "Sua conta é ativada e você já pode entrar!" },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                {step.n}
              </div>
              <p className="text-gray-600 text-sm">{step.text}</p>
            </div>
          ))}
        </div>

        {/* Aviso de spam */}
        <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left">
          <p className="text-gray-500 text-[11px] leading-relaxed">
            📬 <strong>Não chegou?</strong> Peça ao seu responsável para verificar a caixa de{" "}
            <strong>spam</strong> ou <strong>lixo eletrônico</strong>. O remetente é{" "}
            <span className="font-mono">FéConecta</span>.
          </p>
        </div>

        {isApproved ? (
          <div className="w-full bg-green-50 border-2 border-green-400 rounded-2xl p-6 flex flex-col items-center gap-3 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <h3 className="text-lg font-black text-green-900">Autorização Aprovada! 🎉</h3>
            <p className="text-xs text-green-700 leading-relaxed">
              Seu responsável acabou de autorizar o seu acesso. Seja muito bem-vindo(a) ao FéConecta!
            </p>
            <Link
              href="/"
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all mt-2"
            >
              Entrar no FéConecta agora <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-500/30 text-teal-600 bg-teal-50 hover:bg-teal-100 text-sm font-bold transition-all disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
            {resending ? "Reenviando e-mail..." : sentSuccess ? "Reenviar e-mail novamente" : "Reenviar e-mail de autorização"}
          </button>
        )}

        <p className="text-gray-300 text-[11px]">
          LGPD (Lei 13.709/2018), Art. 14 · FéConecta
        </p>


      </div>
    </div>
  );
}

export default function GuardianPendingPage() {
  return (
    <Suspense>
      <PendingContent />
    </Suspense>
  );
}
