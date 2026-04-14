import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const requestPermission = async (userId: string) => {
    if (!messaging || typeof window === 'undefined') return;

    try {
      console.log("Iniciando fluxo de Push v2...");
      
      const permission = await Notification.requestPermission();
      console.log("Status da permissão:", permission);
      
      if (permission === 'granted') {
        const rawVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BPgjTBrNjpljFvNZbvcC8VmDqF5cTHBXUkkcAhOU2Qt3ef_P-BGXdMeNkMMmXqXg8tTsbNnWWShra_sc8rplW5Q";
        const vapidKey = rawVapidKey?.trim();

        // 1. Registrar o Service Worker explicitamente
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // 2. Esperar o SW estar pronto e ativo
        await navigator.serviceWorker.ready;
        console.log("Service Worker registrado e pronto.");

        // 3. Obter o Token
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
          
          toast.success("Notificações Push ativadas!");
          return token;
        }
      }
    } catch (err: any) {
      console.error("Erro detalhado no Push:", err);
      if (err.message?.includes('permission-denied')) {
        toast.error("Você bloqueou as notificações no navegador.");
      } else if (err.message?.includes('unauthorized')) {
        toast.error("Erro 401: A API do Firebase ainda não foi habilitada totalmente.");
      } else {
        toast.error("Erro ao ativar Push. Verifique se não está em modo anônimo.");
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
