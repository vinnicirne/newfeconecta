"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStoredProfile } from "@/lib/profile-cache";

const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 segundos
const THROTTLE_ROUTE_MS = 5 * 1000; // 5 segundos

// Mapeamento amigável de páginas para o Radar de Navegação
export function getFriendlyPageName(pathname: string): { title: string; icon: string; badgeColor: string } {
  if (pathname === "/") return { title: "Feed Principal", icon: "🔥", badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  if (pathname.startsWith("/jogos/blocos")) return { title: "Block Blast", icon: "🧱", badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
  if (pathname.startsWith("/jogos/snake")) return { title: "Google Snake", icon: "🐍", badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  if (pathname.startsWith("/jogos/quiz")) return { title: "Quiz da Bíblia", icon: "📖", badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  if (pathname.startsWith("/jogos/memoria")) return { title: "Jogo da Memória", icon: "🕊️", badgeColor: "bg-sky-500/10 text-sky-500 border-sky-500/20" };
  if (pathname.startsWith("/jogos")) return { title: "Arena de Jogos", icon: "🎮", badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" };
  if (pathname.startsWith("/bible")) return { title: "Bíblia Sagrada", icon: "📜", badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  if (pathname.startsWith("/messages")) return { title: "Chat / Mensagens", icon: "💬", badgeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20" };
  if (pathname.startsWith("/music")) return { title: "Música / Player", icon: "🎵", badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
  if (pathname.startsWith("/notes")) return { title: "Bloco de Notas", icon: "📝", badgeColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
  if (pathname.startsWith("/santuario")) return { title: "Lugar Secreto", icon: "🕯️", badgeColor: "bg-amber-600/10 text-amber-600 border-amber-600/20" };
  if (pathname.startsWith("/room")) return { title: "Sala de Guerra", icon: "⚔️", badgeColor: "bg-red-500/10 text-red-500 border-red-500/20" };
  if (pathname.startsWith("/tribo")) return { title: "Tribo / Vídeos", icon: "⚡", badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
  if (pathname.startsWith("/saved")) return { title: "Itens Salvos", icon: "🔖", badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  if (pathname.startsWith("/semei")) return { title: "Semear / Ofertar", icon: "🌱", badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
  if (pathname.startsWith("/igreja")) return { title: "Igreja / Ministérios", icon: "⛪", badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" };
  if (pathname.startsWith("/profile")) return { title: "Meu Perfil", icon: "👤", badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  if (pathname.startsWith("/admin")) return { title: "Painel Admin", icon: "🛡️", badgeColor: "bg-red-500/10 text-red-500 border-red-500/20" };
  
  return { title: pathname, icon: "🌐", badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
}

export function PresenceTracker() {
  const pathname = usePathname();
  const lastBeatRef = useRef<number>(0);
  const pageEnteredAtRef = useRef<string>(new Date().toISOString());
  const activeChannelRef = useRef<any>(null);

  // Reset do tempo ao mudar de rota
  useEffect(() => {
    pageEnteredAtRef.current = new Date().toISOString();
  }, [pathname]);

  // Enviar pulso de presença atômico no banco de dados com a página atual
  const sendHeartbeat = async (userId: string, targetPath: string = pathname) => {
    const now = Date.now();
    lastBeatRef.current = now;
    const friendly = getFriendlyPageName(targetPath);

    try {
      await supabase
        .from("profiles")
        .update({ 
          updated_at: new Date().toISOString(),
          current_page: targetPath,
          page_title: friendly.title,
          page_entered_at: pageEnteredAtRef.current
        })
        .eq("id", userId);
    } catch (err) {
      // Falha silenciosa não-bloqueante
    }
  };

  useEffect(() => {
    let intervalId: any = null;
    let userId: string | null = null;

    const setupPresence = async () => {
      try {
        const cached = getStoredProfile();
        userId = cached?.id || null;

        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id || null;
        }

        if (!userId) return;

        // 1. Pulso inicial de presença no banco
        sendHeartbeat(userId, pathname);

        // 2. Conectar ao canal Realtime Presence
        const channelName = "presence_online_users";
        const channel = supabase.channel(channelName, {
          config: { presence: { key: userId } }
        });

        activeChannelRef.current = channel;
        const friendly = getFriendlyPageName(pathname);

        channel
          .on("presence", { event: "sync" }, () => {
            try {
              const state = channel.presenceState();
              const onlineIds = Object.keys(state);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("presence-sync", { 
                  detail: {
                    onlineIds,
                    state
                  } 
                }));
              }
            } catch (err) {}
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && userId) {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
                route: pathname,
                page_title: friendly.title,
                page_icon: friendly.icon,
                entered_at: pageEnteredAtRef.current,
                user_name: cached?.full_name || cached?.username || "Usuário",
                avatar_url: cached?.avatar_url || null
              });
            }
          });

        // 3. Heartbeat periódico a cada 45s
        intervalId = setInterval(() => {
          if (userId && document.visibilityState === "visible") {
            sendHeartbeat(userId, pathname);
          }
        }, HEARTBEAT_INTERVAL_MS);

      } catch (e) {
        // Ignora erros transitórios
      }
    };

    setupPresence();

    // 4. Disparar heartbeat instantâneo quando o usuário foca na aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userId) {
        const timeSinceLast = Date.now() - lastBeatRef.current;
        if (timeSinceLast > 20000) {
          sendHeartbeat(userId, pathname);
        }
      }
    };

    // 5. Atualizar presença na saída da página
    const handleBeforeUnload = () => {
      if (activeChannelRef.current) {
        activeChannelRef.current.untrack();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (activeChannelRef.current) {
        activeChannelRef.current.unsubscribe();
      }
    };
  }, []);

  // Atualizar presença em transições de rotas
  useEffect(() => {
    const cached = getStoredProfile();
    const userId = cached?.id;
    if (userId) {
      const now = Date.now();
      if (now - lastBeatRef.current > THROTTLE_ROUTE_MS) {
        sendHeartbeat(userId, pathname);
      }
      if (activeChannelRef.current) {
        const friendly = getFriendlyPageName(pathname);
        activeChannelRef.current.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          route: pathname,
          page_title: friendly.title,
          page_icon: friendly.icon,
          entered_at: pageEnteredAtRef.current,
          user_name: cached?.full_name || cached?.username || "Usuário",
          avatar_url: cached?.avatar_url || null
        }).catch(() => {});
      }
    }
  }, [pathname]);

  return null;
}
