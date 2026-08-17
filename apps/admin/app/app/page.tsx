"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AppRedirectPage() {
  useEffect(() => {
    // Tenta abrir o aplicativo nativo via Custom Scheme
    window.location.href = "feconecta://login-callback";

    // Fallback: se não abrir o app em 2.5 segundos, redireciona para a Play Store
    const timer = setTimeout(() => {
      window.location.href = "https://play.google.com/store/apps/details?id=com.feconecta.myapp&hl=pt_BR";
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B141A] text-white">
      <Loader2 className="w-10 h-10 animate-spin text-[#00A676] mb-4" />
      <h1 className="text-xl font-bold">Abrindo FéConecta...</h1>
      <p className="text-sm text-gray-400 mt-2 text-center max-w-xs">
        Se o aplicativo não abrir automaticamente, você será redirecionado para a Play Store.
      </p>
    </div>
  );
}
