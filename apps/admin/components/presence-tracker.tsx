"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStoredProfile } from "@/lib/profile-cache";
import { usePlayerStore } from "@/modules/femusic/infrastructure/state/usePlayerStore";

const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 segundos
const THROTTLE_ROUTE_MS = 4 * 1000; // 4 segundos

// Mapeamento amigável de páginas para o Radar de Navegação
export function getFriendlyPageName(
  pathname: string, 
  isFullScreenMusic?: boolean, 
  currentTrackTitle?: string
): { title: string; icon: string; route: string; badgeColor: string } {
  // 1. Se o player do FéMusic estiver aberto em Fullscreen
  if (isFullScreenMusic) {
    const title = currentTrackTitle ? `FéMusic (${currentTrackTitle})` : "FéMusic";
    return { title, icon: "🎵", route: "/music", badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
  }

  // 2. Rotas do FéMusic
  if (pathname.startsWith("/music/discover")) return { title: "FéMusic (Descobrir)", icon: "🎵", route: pathname, badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
  if (pathname.startsWith("/music/search")) return { title: "FéMusic (Buscar)", icon: "🔍", route: pathname, badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
  if (pathname.startsWith("/music/library")) return { title: "FéMusic (Biblioteca)", icon: "📚", route: pathname, badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
  if (pathname.startsWith("/music")) return { title: "FéMusic", icon: "🎵", route: pathname, badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20" };

  // 3. Outras rotas do ecossistema FéConecta
  if (pathname === "/") return { title: "Feed Principal", icon: "🔥", route: "/", badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  if (pathname.startsWith("/jogos/blocos")) return { title: "Block Blast", icon: "🧱", route: pathname, badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
  if (pathname.startsWith("/jogos/snake")) return { title: "Google Snake", icon: "🐍", route: pathname, badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  if (pathname.startsWith("/jogos/quiz")) return { title: "Quiz da Bíblia", icon: "📖", route: pathname, badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  if (pathname.startsWith("/jogos/memoria")) return { title: "Jogo da Memória", icon: "🕊️", route: pathname, badgeColor: "bg-sky-500/10 text-sky-500 border-sky-500/20" };
  if (pathname.startsWith("/jogos")) return { title: "Arena de Jogos", icon: "🎮", route: pathname, badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" };
  if (pathname.startsWith("/bible")) return { title: "Bíblia Sagrada", icon: "📜", route: pathname, badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  if (pathname.startsWith("/messages")) return { title: "Chat", icon: "💬", route: pathname, badgeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20" };
  if (pathname.startsWith("/notes")) return { title: "Bloco de Notas", icon: "📝", route: pathname, badgeColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
  if (pathname.startsWith("/santuario")) return { title: "Lugar Secreto", icon: "🕯️", route: pathname, badgeColor: "bg-amber-600/10 text-amber-600 border-amber-600/20" };
  if (pathname.startsWith("/room")) return { title: "Sala de Guerra", icon: "⚔️", route: pathname, badgeColor: "bg-red-500/10 text-red-500 border-red-500/20" };
  if (pathname.startsWith("/tribo")) return { title: "Tribo / Vídeos", icon: "⚡", route: pathname, badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
  if (pathname.startsWith("/saved")) return { title: "Itens Salvos", icon: "🔖", route: pathname, badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  if (pathname.startsWith("/semei")) return { title: "Semear / Ofertar", icon: "🌱", route: pathname, badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
  if (pathname.startsWith("/igreja")) return { title: "Igreja / Ministérios", icon: "⛪", route: pathname, badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" };
  if (pathname.startsWith("/profile")) return { title: "Meu Perfil", icon: "👤", route: pathname, badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  if (pathname.startsWith("/admin")) return { title: "Painel Admin", icon: "🛡️", route: pathname, badgeColor: "bg-red-500/10 text-red-500 border-red-500/20" };
  
  return { title: pathname, icon: "🌐", route: pathname, badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
}

export function PresenceTracker() {
  const pathname = usePathname();
  const isFullScreen = usePlayerStore((s) => s.isFullScreen);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const lastBeatRef = useRef<number>(0);
  const pageEnteredAtRef = useRef<string>(new Date().toISOString());
  const activeChannelRef = useRef<any>(null);

  // Informações da página atual considerando rotas ou player do FéMusic
  const currentFriendly = getFriendlyPageName(pathname, isFullScreen, currentTrack?.title);

  // Reset do tempo ao mudar de rota ou ao abrir/fechar o player fullscreen do FéMusic
  useEffect(() => {
    pageEnteredAtRef.current = new Date().toISOString();
  }, [pathname, isFullScreen]);

  // Enviar pulso de presença atômico no banco de dados com a página atual
  const sendHeartbeat = async (userId: string) => {
    const now = Date.now();
    lastBeatRef.current = now;

    try {
      await supabase
        .from("profiles")
        .update({ 
          updated_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          current_page: currentFriendly.route,
          page_title: currentFriendly.title,
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
        sendHeartbeat(userId);

        // 2. Conectar ao canal Realtime Presence
        const channelName = "presence_online_users";
        const channel = supabase.channel(channelName, {
          config: { presence: { key: userId } }
        });

        activeChannelRef.current = channel;

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
                route: currentFriendly.route,
                page_title: currentFriendly.title,
                page_icon: currentFriendly.icon,
                entered_at: pageEnteredAtRef.current,
                user_name: cached?.full_name || cached?.username || "Usuário",
                avatar_url: cached?.avatar_url || null
              });
            }
          });

        // 3. Heartbeat periódico a cada 30s
        intervalId = setInterval(() => {
          if (userId && document.visibilityState === "visible") {
            sendHeartbeat(userId);
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
        if (timeSinceLast > 15000) {
          sendHeartbeat(userId);
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

  // Atualizar presença em transições de rotas ou quando o FéMusic fullscreen abre/fecha
  useEffect(() => {
    const cached = getStoredProfile();
    const userId = cached?.id;
    if (userId) {
      const now = Date.now();
      if (now - lastBeatRef.current > THROTTLE_ROUTE_MS) {
        sendHeartbeat(userId);
      }
      if (activeChannelRef.current) {
        activeChannelRef.current.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          route: currentFriendly.route,
          page_title: currentFriendly.title,
          page_icon: currentFriendly.icon,
          entered_at: pageEnteredAtRef.current,
          user_name: cached?.full_name || cached?.username || "Usuário",
          avatar_url: cached?.avatar_url || null
        }).catch(() => {});
      }
    }
  }, [pathname, isFullScreen, currentTrack?.title]);

  return null;
}
