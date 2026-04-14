import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const requestPermission = async (userId: string) => {
    if (!messaging) return;

    try {
      // 1. Solicita permissão ao navegador
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // 2. Obtém o Token do Firebase
        // Nota: Substitua pela sua VAPID Key se tiver!
        const token = await getToken(messaging, {
          vapidKey: "COLAR_SUA_VAPID_KEY_AQUI" 
        });

        if (token) {
          console.log("FCM Token gerado:", token);
          
          // 3. Salva o Token no Supabase no perfil do usuário
          const { error } = await supabase
            .from('profiles')
            .update({ 
              fcm_token: token,
              push_notifications_enabled: true 
            })
            .eq('id', userId);

          if (error) throw error;
          
          return token;
        }
      } else {
        console.warn("Permissão de notificação negada.");
      }
    } catch (err) {
      console.error("Erro ao configurar Push Notifications:", err);
    }
  };

  // Listener para mensagens quando o app está aberto (Foreground)
  const listenToForegroundMessages = () => {
    if (!messaging) return;
    
    onMessage(messaging, (payload) => {
      console.log("Mensagem recebida em primeiro plano:", payload);
      toast(payload.notification?.title || "Notificação", {
        description: payload.notification?.body,
        action: {
          label: "Ver",
          onClick: () => console.log("Clicou na notificação"),
        },
      });
    });
  };

  return { requestPermission, listenToForegroundMessages };
};
