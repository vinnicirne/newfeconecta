'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function GuardianApprovalForm() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const approve = async () => {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError('Este link de autorização é inválido.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/guardian/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a autorização.');
      router.replace(`/guardian/result?status=approved&name=${encodeURIComponent(result.name || 'seu filho(a)')}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a autorização.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-7 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-black text-white">Autorizar cadastro</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Confirme que você é o responsável legal e autoriza o cadastro solicitado no FéConecta.
        </p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button
          type="button"
          onClick={approve}
          disabled={loading || !token}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {loading ? 'Confirmando autorização...' : 'Confirmar autorização'}
        </button>
        <p className="mt-4 text-xs text-zinc-500">Este link é pessoal, expira em 7 dias e só pode ser usado uma vez.</p>
      </section>
    </main>
  );
}
