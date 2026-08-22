"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, Settings, RefreshCw, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Chave para lembrar que o usuário escolheu pular
const SKIP_KEY = "fc_notification_skipped";

export function NotificationEnforcer({ userId }: { userId: string | null }) {
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt" | "checking" | "unsupported">("checking");
  const { requestPermission } = usePushNotifications();
  const [isChecking, setIsChecking] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const checkStatus = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Se o usuário já pulou, não bloquear
    if (sessionStorage.getItem(SKIP_KEY)) {
      setSkipped(true);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const status = await PushNotifications.checkPermissions();
        setPermissionStatus(status.receive as any);
      } catch {
        setPermissionStatus("unsupported");
      }
    } else {
      if (!("Notification" in window)) {
        setPermissionStatus("unsupported");
        return;
      }
      setPermissionStatus(Notification.permission as any);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Verifica skip imediatamente
    if (sessionStorage.getItem(SKIP_KEY)) {
      setSkipped(true);
      return;
    }

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [userId, checkStatus]);

  const handleRequest = async () => {
    setIsChecking(true);
    if (userId) {
      await requestPermission(userId, true);
    }
    await checkStatus();
    setIsChecking(false);
  };

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_KEY, "1");
    setSkipped(true);
  };

  // Não bloquear se:
  // - sem usuário logado
  // - ainda verificando
  // - já concedido
  // - não suportado (incógnito/browser restrito)
  // - usuário pulou
  if (
    !userId ||
    permissionStatus === "checking" ||
    permissionStatus === "granted" ||
    permissionStatus === "unsupported" ||
    skipped
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999999] bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-whatsapp-teal/20 blur-[60px] rounded-full pointer-events-none" />

        <div className="w-20 h-20 rounded-full bg-whatsapp-teal/10 border border-whatsapp-teal/30 flex items-center justify-center mb-6">
          <Bell className="w-10 h-10 text-whatsapp-teal" />
        </div>

        <h2 className="text-2xl font-black text-white mb-3">Ative as Notificações</h2>

        {permissionStatus === "prompt" || (permissionStatus as string) === "default" ? (
          <>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Para usar o FéConecta, é obrigatório permitir as notificações. Assim você não perde orações, alertas da Sala de Guerra e mensagens importantes.
            </p>
            <button
              onClick={handleRequest}
              disabled={isChecking}
              className="w-full bg-whatsapp-teal text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-whatsapp-tealLight transition-colors flex items-center justify-center gap-2 mb-3"
            >
              {isChecking ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Permitir Notificações"}
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-gray-500 hover:text-gray-300 text-xs py-2 transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Continuar sem notificações
            </button>
          </>
        ) : (
          <>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-400 font-bold mb-2 justify-center">
                <AlertTriangle className="w-5 h-5" /> Notificações bloqueadas
              </div>
              <p className="text-sm text-red-200/70">
                Você negou a permissão anteriormente. Para ativar, clique no cadeado na barra de endereços e <strong>Permita as notificações</strong> para este site. Ou continue sem notificações por ora.
              </p>
            </div>

            <button
              onClick={checkStatus}
              className="w-full bg-white/10 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2 border border-white/10 mb-3"
            >
              <Settings className="w-5 h-5" />
              Já liberei nas configurações
            </button>
            <button
              onClick={handleSkip}
              className="w-full text-gray-500 hover:text-gray-300 text-xs py-2 transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Continuar sem notificações
            </button>
          </>
        )}
      </div>
    </div>
  );
}
