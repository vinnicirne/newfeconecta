import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const requestPermission = async (userId: string) => {
    if (!messaging || typeof window === 'undefined') return;

    try {
      console.log("Iniciando fluxo de Push no NOVO PROJETO...");
      
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // NOVO VAPID KEY do projeto feconecta-4ccac
        const vapidKey = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BIcTtDtkjuEgeJv_7CUPUq0lkZPlWx5awD7PxDkH39pe89c3hlKgtgv6OwuoS2hkcahTS2VCYKv04KdTD7m2eus").trim();

        // 1. Registrar o Service Worker explicitamente
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        // 2. Obter o Token
        const token = await getToken(messaging, { 
          vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log("Token gerado com sucesso no novo projeto:", token);
          
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: token, push_notifications_enabled: true })
            .eq('id', userId);

          if (error) throw error;
          
          toast.success("Notificações Push ativadas com sucesso!");
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
      console.log("Mensagem recebida:", payload);
      toast(payload.notification?.title || "Notificação", {
        description: payload.notification?.body,
      });
    });
  };

  return { requestPermission, listenToForegroundMessages };
};
