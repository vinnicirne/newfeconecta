"use client";

import React, { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function FenamoroBanner({ currentUser }: { currentUser: any }) {
  const [loading, setLoading] = useState(false);
  
  // Inicia estritamente como FALSE para eliminar qualquer piscar na tela (Anti-Flash)
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('fc_feed_controls_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.show_fenamoro_banner === true;
        }
      } catch (e) {}
    }
    return false;
  });

  useEffect(() => {
    // 1. Escuta eventos customizados de atualização do feed
    const handleUpdate = (e: any) => {
      if (e.detail && typeof e.detail.show_fenamoro_banner === 'boolean') {
        setVisible(e.detail.show_fenamoro_banner);
      }
    };
    window.addEventListener('feed-controls-updated', handleUpdate);

    // 2. Consulta em background do system_configs
    supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'feed_display_controls_v1')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && typeof data.value.show_fenamoro_banner === 'boolean') {
          setVisible(data.value.show_fenamoro_banner);
          try {
            const cached = localStorage.getItem('fc_feed_controls_v1');
            const currentObj = cached ? JSON.parse(cached) : {};
            localStorage.setItem('fc_feed_controls_v1', JSON.stringify({
              ...currentObj,
              show_fenamoro_banner: data.value.show_fenamoro_banner
            }));
          } catch (e) {}
        }
      });

    return () => {
      window.removeEventListener('feed-controls-updated', handleUpdate);
    };
  }, []);

  if (!visible) return null;

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
    <div className="px-4 mt-4 mb-2 animate-in fade-in duration-300">
      <div className="relative rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        onClick={handleSSO}>
        {/* Background Blur Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800')" }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-teal-900/80 to-transparent" />

        {/* Content */}
        <div className="relative p-6 z-10 flex flex-col justify-between h-44">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              </div>
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">FéNamoro</span>
            </div>
            
            <h3 className="text-xl font-black text-white leading-tight">
              Buscando conexões com propósito?
            </h3>
            <p className="text-xs text-white/80 mt-1 max-w-[280px]">
              Encontre cristãos da mesma fé perto de você.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-4 py-2 rounded-full flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando...
                </>
              ) : (
                <>Ativar meu perfil 🕊️</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
