import { useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export const usePushNotifications = () => {
  const router = useRouter();

  const requestPermission = useCallback(async (userId: string, showToast = false) => {
    if (typeof window === 'undefined') return;

    // --- LÓGICA NATIVA (CAPACITOR) ---
    if (Capacitor.isNativePlatform()) {
      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn("Permissão de Push negada no Mobile");
          return;
        }

        await PushNotifications.register();

        // Listener para capturar o token nativo do Firebase
        PushNotifications.addListener('registration', async (token) => {
          const fcmToken = token.value;
          if (fcmToken) {
            const { error } = await supabase
              .from('profiles')
              .update({
                fcm_token: fcmToken,
                push_notifications_enabled: true
              })
              .eq('id', userId);

            if (!error && showToast) {
              toast.success("Notificações integradas ao dispositivo! 📲");
            }
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error("Erro no registro nativo de Push:", err);
        });

      } catch (err) {
        console.error("Falha no Push Nativo (não crítico):", err);
        // Não lança erro para não quebrar a app
      }
      return;
    }

    // --- LÓGICA WEB (FIREBASE) ---
    if (!messaging || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn("FéConecta: Notificações Push Web não suportadas neste navegador.");
      return;
    }

    try {
      // Verifica IndexedDB (necessário para Firebase)
      if (!window.indexedDB) {
        console.warn("FéConecta: IndexedDB não disponível. Push desativado.");
        return;
      }

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const vapidKey = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "").trim();

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope'
        }).catch(err => {
          if (err.name === 'SecurityError') {
             console.warn("FéConecta: Service Worker bloqueado por restrições de segurança.");
             return null;
          }
          throw err;
        });

        if (!registration) return;
        
        await navigator.serviceWorker.ready;

        let token = null;
        try {
          token = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: registration
          });
        } catch (e: any) {
          // Silencia erros de lock ou permissão em abas inativas
          if (e?.name === 'AbortError' || e?.message?.includes('lock') || e?.message?.includes('permission')) return;
          console.warn("FéConecta: Falha ao obter token FCM:", e.message);
          return;
        }

        if (token) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              fcm_token: token,
              push_notifications_enabled: true 
            })
            .eq('id', userId);

          if (!error && showToast) {
            toast.success("Notificações Push configuradas! 🔔");
          }
          return token;
        }
      }
    } catch (err: any) {
      console.error("Erro no Push Web:", err);
    }
  }, []);

  const listenToForegroundMessages = useCallback(() => {
    // Escuta Nativa
    if (Capacitor.isNativePlatform()) {
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        // Removemos o toast daqui pois o listenToInternalNotifications já exibe o toast em tempo real
        console.log("Push nativo recebido em foreground", notification);
      });

      // ✅ Handler de TOQUE na notificação (background / app fechado)
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification?.data;
        console.log("🔔 Notificação tocada:", data);

        const url = data?.url || data?.link;
        if (url) {
          try {
            // Remove a origem para obter só o pathname
            const path = url.startsWith('http') ? new URL(url).pathname + new URL(url).search : url;
            router.push(path);
          } catch {
            router.push(url);
          }
        }
      });
      return;
    }

    // Escuta Web
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log("Push Firebase Web recebido em foreground", payload);
    });

    // ✅ Handler de TOQUE para notificações Web (via service worker postMessage)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PUSH_CLICK') {
          const url = event.data?.url || event.data?.link;
          if (url) {
            try {
              const path = url.startsWith('http') ? new URL(url).pathname + new URL(url).search : url;
              router.push(path);
            } catch {
              router.push(url);
            }
          }
        }
      });
    }
  }, [router]);

  const listenToInternalNotifications = useCallback(async (userId: string) => {
    const channelName = `internal-notifications-${userId}`;
    
    // Remove canal existente para evitar erro "after subscribe" em re-renderizações
    const existingChannel = supabase.getChannels().find((ch: any) => ch.topic === `realtime:${channelName}` || ch.topic === channelName);
    if (existingChannel) {
      await supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        async (payload) => {
          console.log("🔔 Notificação interna recebida:", payload);
          
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const titleMap: Record<string, string> = {
            'like': 'Curtiu seu post',
            'comment': 'Comentou no seu post',
            'follow': 'Começou a te seguir',
            'mention': 'Mencionou você',
            'repost': 'Republicou seu post',
            'room_invite': 'Convidou você para uma Sala de Guerra 🙏',
            'story_reaction': 'Reagiu ao seu Status',
            'message': 'Enviou uma mensagem',
            'broadcast': 'Aviso Oficial',
            'verse_day': 'Palavra de Hoje 📖',
            'church_join_request': 'Solicitou entrada na igreja',
            'church_approved': 'Aprovou sua entrada na igreja ✅',
            'church_rejected': 'Sua solicitação foi recusada',
            'church_group_request': 'Solicitou entrada no grupo',
          };

          const isGlobal = ['broadcast', 'verse_day'].includes(payload.new.type);
          const title = isGlobal 
            ? (payload.new.title || titleMap[payload.new.type]) 
            : (sender?.full_name || "Alguém");
            
          const actionText = isGlobal ? "" : (titleMap[payload.new.type] || "enviou uma notificação");
          
          toast(isGlobal ? title : `${title} ${actionText}`, {
            description: payload.new.content || "",
            action: {
              label: "Ver",
              onClick: () => {
                const meta = payload.new.metadata;
                const churchSlug = meta?.church_slug;

                if (payload.new.type === 'message') {
                   router.push(`/messages?userId=${payload.new.sender_id}`);
                } else if (payload.new.type === 'church_join_request' && churchSlug) {
                   router.push(`/igreja/${churchSlug}/admin/membros`);
                } else if (payload.new.type === 'church_approved' && churchSlug) {
                   router.push(`/igreja/${churchSlug}`);
                } else if (payload.new.type === 'church_rejected') {
                   router.push(`/igreja`);
                } else if (payload.new.type === 'church_group_request' && churchSlug) {
                   const groupId = meta?.group_id || '';
                   router.push(`/igreja/${churchSlug}/celula/${groupId}`);
                } else if (payload.new.link) {
                   router.push(payload.new.link);
                } else if (payload.new.post_id) {
                   router.push(`/feed?post=${payload.new.post_id}`);
                } else if (payload.new.type === 'follow') {
                   router.push(`/profile/${sender?.full_name}`);
                }
              }
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return { requestPermission, listenToForegroundMessages, listenToInternalNotifications };
};
