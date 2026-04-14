import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const requestPermission = async (userId: string) => {
    if (!messaging) return;

    try {
      console.log("Iniciando pedido de permissão para Push...");
      const permission = await Notification.requestPermission();
      console.log("Status da permissão:", permission);
      
      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        console.log("VAPID Key presente:", !!vapidKey);

        if (!vapidKey) {
          console.error("ERRO: NEXT_PUBLIC_FIREBASE_VAPID_KEY não encontrada no .env");
          return;
        }

        // 2. Obtém o Token do Firebase
        const token = await getToken(messaging, { vapidKey });

        if (token) {
          console.log("Token gerado com sucesso:", token);
          
          // 3. Salva o Token no Supabase
          const { error } = await supabase
            .from('profiles')
            .update({ 
              fcm_token: token,
              push_notifications_enabled: true 
            })
            .eq('id', userId);

          if (error) throw error;
          
          toast.success("Notificações Push ativadas com sucesso!");
          return token;
        } else {
          console.warn("Firebase não retornou nenhum token.");
        }
      }
    } catch (err: any) {
      console.error("Erro detalhado no Push:", err);
      if (err.message.includes('missing-registration')) {
        toast.error("Erro: Arquivo service-worker não encontrado na raiz.");
      }
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
