"use client";

import React, { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  Bell, 
  Send, 
  X, 
  Sparkles, 
  RefreshCw, 
  Smartphone, 
  CheckCircle2, 
  BookOpen, 
  Megaphone,
  Flame,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ForceNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
}

const TEMPLATES = [
  {
    label: "🕊️ Palavra do Dia",
    title: "🕊️ Uma Palavra para seu Coração",
    content: "O Senhor é o meu pastor; de nada terei falta. (Salmos 23:1)",
    type: "verse_day"
  },
  {
    label: "📢 Comunicado Pastoral",
    title: "📢 Comunicado da Liderança",
    content: "Paz do Senhor! Temos um aviso importante para você hoje.",
    type: "broadcast"
  },
  {
    label: "🔥 Chamado de Oração",
    title: "🔥 Intercessão & Clamor",
    content: "Irmão(ã), junte-se a nós na War Room em clamor agora!",
    type: "new_room"
  },
  {
    label: "⭐ Selo & Conta",
    title: "⭐ Atualização Ministerial",
    content: "Seu perfil e credencial foram atualizados pela administração!",
    type: "broadcast"
  }
];

export function ForceNotificationModal({ isOpen, onClose, user }: ForceNotificationModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notifType, setNotifType] = useState<string>("broadcast");
  const [sending, setSending] = useState(false);

  if (!user) return null;

  const handleSelectTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setContent(tmpl.content);
    setNotifType(tmpl.type);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      return toast.error("Preencha o título e a mensagem");
    }

    setSending(true);
    const toastId = toast.loading(`Transmitindo sinal para @${user.username || 'usuário'}...`);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const campaignId = crypto.randomUUID();

      const payload = {
        recipient_id: user.id,
        sender_id: authUser?.id || null,
        profile_id: user.id,
        user_id: user.id,
        type: notifType,
        title: title.trim(),
        content: content.trim(),
        is_read: false,
        priority: "high",
        metadata: {
          push_banner: true,
          sound: "default",
          forced_direct: true,
          campaign_id: campaignId,
          audience_type: "individual_forced"
        }
      };

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(payload);

      if (insertError) throw insertError;

      // Log de Auditoria
      await supabase.from("system_errors").insert({
        module: "admin_forced_notification",
        error_message: `[FORCED_PUSH] Emitido para ${user.username} (${user.id}): ${title}`,
        metadata: { recipient_id: user.id, title, campaign_id: campaignId }
      });

      toast.success(`Notificação entregue com sucesso para @${user.username || 'usuário'}! 🚀`, { id: toastId });
      setTitle("");
      setContent("");
      onClose();
    } catch (err: any) {
      console.error("Erro ao forçar notificação:", err);
      toast.error("Falha ao entregar sinal: " + err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-[#0f0f0f] dark:text-white rounded-[32px] border border-gray-200 dark:border-white/10 shadow-2xl p-0 overflow-hidden max-h-[92vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-whatsapp-teal to-emerald-700 text-white relative">
            <DialogPrimitive.Close className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors">
              <X className="w-4 h-4 text-white" />
            </DialogPrimitive.Close>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Canal Direto de Transmissão</span>
                <DialogPrimitive.Title className="text-xl font-black">Forçar Notificação</DialogPrimitive.Title>
              </div>
            </div>
            <p className="text-xs text-white/80">Dispara push imediato no aparelho e insere o alerta na central do usuário.</p>
          </div>

          {/* User Target Badge */}
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-whatsapp-teal/10 overflow-hidden border border-whatsapp-teal/30 flex items-center justify-center">
                  {user.avatar_url && !user.avatar_url.includes('vercel.sh') ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="font-black text-whatsapp-teal uppercase text-sm">
                      {user.full_name ? user.full_name[0] : 'U'}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{user.full_name || 'Usuário FéConecta'}</h4>
                  <p className="text-xs text-whatsapp-teal dark:text-whatsapp-green font-semibold">@{user.username || 'n/a'}</p>
                </div>
              </div>

              <div className="text-right">
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                  user.fcm_token ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                )}>
                  <Smartphone className="w-3 h-3" />
                  {user.fcm_token ? "Aparelho Conectado" : "Alerta In-App"}
                </span>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Modelos Rápidos (1-Clique)</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="p-2.5 text-left rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent transition-all text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título da Notificação</label>
                <input
                  type="text"
                  placeholder="Ex: 🕊️ Uma palavra para seu coração"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 ring-whatsapp-teal/50 font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mensagem / Conteúdo</label>
                <textarea
                  rows={3}
                  placeholder="Escreva a mensagem que aparecerá no banner do celular..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 ring-whatsapp-teal/50 text-sm resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 bg-whatsapp-teal hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-whatsapp-teal/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Emitindo Sinal...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Forçar Envio Imediato
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
