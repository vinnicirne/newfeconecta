import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const usePushNotifications = () => {
  const router = useRouter();

  const requestPermission = async (userId: string, showToast = false) => {
    if (!messaging || typeof window === 'undefined') return;

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const vapidKey = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BIcTtDtkjuEgeJv_7CUPUq0lkZPlWx5awD7PxDkH39pe89c3hlKgtgv6OwuoS2hkcahTS2VCYKv04KdTD7m2eus").trim();

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        let token = null;
        try {
          token = await getToken(messaging, { 
            vapidKey,
            serviceWorkerRegistration: registration
          });
        } catch (e: any) {
          if (e?.name === 'AbortError' || e?.message?.includes('lock') || e?.message?.includes('steal')) {
            console.warn("Push token lock contention, ignoring safely.");
            return;
          }
          throw e;
        }

        if (token) {
          // Só salva e mostra toast se o token for novo ou diferente
          const { error } = await supabase
            .from('profiles')
            .update({ 
              fcm_token: token,
              push_notifications_enabled: true 
            })
            .eq('id', userId);

          if (error) throw error;
          
          if (showToast) {
            toast.success("Notificações Push configuradas! 🔔");
          }
          return token;
        }
      }
    } catch (err: any) {
      console.error("Erro detalhado no Push:", err);
      if (err.message?.includes('unauthorized')) {
        toast.error("Ative a 'Cloud Messaging API' no console do Google Cloud deste novo projeto.");
      }
    }
  };

  const listenToForegroundMessages = () => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log("Mensagem recebida em foreground:", payload);
      
      const title = payload.data?.title || payload.notification?.title || "FéConecta 📢";
      const body = payload.data?.body || payload.notification?.body;
      const postId = payload.data?.post_id;
      const targetUrl = postId ? `/feed?post=${postId}` : '/feed';

      toast(title, {
        description: body,
        action: {
          label: "Ver agora",
          onClick: () => router.push(targetUrl)
        },
      });
    });
  };

  return { requestPermission, listenToForegroundMessages };
};
