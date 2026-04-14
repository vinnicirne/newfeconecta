import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const requestPermission = async (userId: string) => {
    if (!messaging || typeof window === 'undefined') return;

    try {
      console.log("Iniciando fluxo de Push v3...");
      
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();

        if (!vapidKey) {
          console.error("ERRO: VAPID_KEY não configurada na Vercel/Env.");
          toast.error("Erro de Configuração: VAPID_KEY ausente.");
          return;
        }

        // 1. Registrar o Service Worker explicitamente
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        // 2. Obter o Token (O erro 400 morre aqui se a VAPID_KEY na Vercel estiver certa)
        const token = await getToken(messaging, { 
          vapidKey,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log("Token gerado com sucesso:", token);
          
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: token, push_notifications_enabled: true })
            .eq('id', userId);

          if (error) throw error;
          
          toast.success("Push ativado com sucesso!");
          return token;
        }
      }
    } catch (err: any) {
      console.error("Erro detalhado no Push:", err);
      if (err.message?.includes('invalid-argument')) {
        toast.error("Erro 400: A Chave VAPID na Vercel não combina com seu Projeto Firebase.");
      } else {
        toast.error("Erro ao ativar Push. Verifique a configuração.");
      }
    }
  };

  const listenToForegroundMessages = () => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      console.log("Mensagem em primeiro plano:", payload);
      toast(payload.notification?.title || "Notificação", {
        description: payload.notification?.body,
      });
    });
  };

  return { requestPermission, listenToForegroundMessages };
};
