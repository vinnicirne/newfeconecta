"use client";

import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FenamoroBanner({ currentUser }: { currentUser: any }) {
  const [loading, setLoading] = useState(false);

  const handleSSO = async () => {
    if (!currentUser) {
      alert("Você precisa estar logado!");
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) throw new Error("Sessão não encontrada");

      console.log("Iniciando SSO para FéNamoro...");

      const res = await fetch('/api/sso/fenamoro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await res.json();
      console.log("Resposta SSO:", data);

      if (!res.ok) throw new Error(data.error || "Falha ao gerar ticket");
      if (!data.token) throw new Error("Token não recebido");
      if (!data.email) throw new Error("Email não recebido");
      if (!process.env.NEXT_PUBLIC_FENAMORO_URL && process.env.NODE_ENV === 'production') {
        throw new Error("URL de destino do SSO não está configurada.");
      }
      const fenamoroUrl = `${process.env.NEXT_PUBLIC_FENAMORO_URL || 'http://localhost:3001'}/sso-callback?token=${data.token}&email=${encodeURIComponent(data.email)}&source=feconecta`;
      console.log("Redirecionando para:", fenamoroUrl);
      window.location.href = fenamoroUrl;
    } catch (err: any) {
      console.error("Erro SSO:", err);
      alert(err.message || "Erro ao conectar ao FéNamoro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 mt-4 mb-2">
      <div className="relative rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        onClick={handleSSO}>
        {/* Background Blur Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800')" }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,31,28,0.95), rgba(10,31,28,0.6))" }} />

        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-whatsapp-green/20">
              <Heart className="w-4 h-4 text-whatsapp-green fill-whatsapp-green" />
            </div>
            <span className="font-outfit font-bold text-white text-lg tracking-tight">FéNamoro</span>
          </div>
          
          <h3 className="font-jakarta font-bold text-white text-xl mb-1 text-balance">
            Buscando conexões com propósito?
          </h3>
          <p className="font-manrope text-white/70 text-sm mb-4 max-w-[260px] leading-tight">
            Encontre cristãos da mesma fé perto de você.
          </p>

          <button 
            disabled={loading}
            className="self-start px-5 py-2.5 rounded-full text-white text-sm font-bold flex items-center gap-2 transition-all"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ativar meu perfil 🕊️"}
          </button>
        </div>
      </div>
    </div>
  );
}
