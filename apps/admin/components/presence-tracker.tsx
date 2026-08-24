"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStoredProfile } from "@/lib/profile-cache";

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 60 segundos
const THROTTLE_ROUTE_MS = 15 * 1000; // Mínimo de 15s entre trocas de rota

export function PresenceTracker() {
  const pathname = usePathname();
  const lastBeatRef = useRef<number>(0);
  const activeChannelRef = useRef<any>(null);

  // Enviar pulso de presença atômico no banco de dados
  const sendHeartbeat = async (userId: string) => {
    const now = Date.now();
    lastBeatRef.current = now;

    try {
      await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
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

        // 1. Pulso inicial de presença
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
                window.dispatchEvent(new CustomEvent("presence-sync", { detail: onlineIds }));
              }
            } catch (err) {}
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && userId) {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
                route: pathname
              });
            }
          });

        // 3. Heartbeat periódico a cada 60s
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
        if (timeSinceLast > 30000) {
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

  // Atualizar presença em transições de rotas (com throttle de 15s)
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
          route: pathname
        }).catch(() => {});
      }
    }
  }, [pathname]);

  return null;
}
