"use client";

import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  Send, 
  Users, 
  History, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  LayoutDashboard
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";

import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function AdminPushCenter() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, sentLast24h: 0 });
  const { requestPermission, listenToForegroundMessages } = usePushNotifications();

  useEffect(() => {
    const autoRegister = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await requestPermission(user.id);
        listenToForegroundMessages();
        loadStats();
      }
    };
    
    autoRegister();
  }, []);

  const loadStats = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    
    // Simplificado para exemplo
    setStats({ 
      totalUsers: count || 0, 
      sentLast24h: 0 
    });
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.error("Preencha todos os campos");

    setSending(true);
    try {
      // 1. Pegar todos os perfis que possuem fcm_token
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .not('fcm_token', 'is', null);

      if (fetchError) throw fetchError;

      if (!profiles || profiles.length === 0) {
        toast.error("Nenhum usuário com notificações ativadas encontrado.");
        return;
      }

      // 2. Inserir notificações em massa (isso disparará o Trigger/Push)
      const notifications = profiles.map(p => ({
        recipient_id: p.id,
        type: 'broadcast',
        content: `${title}: ${message}`,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      toast.success(`Push enviado para ${profiles.length} usuários!`);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      console.error("Erro ao disparar push:", err);
      toast.error("Falha ao enviar: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-whatsapp-dark text-gray-900 dark:text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-whatsapp-teal mb-1">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Painel Administrativo</span>
            </div>
            <h1 className="text-3xl font-black">Central de Transmissão</h1>
          </div>
          <Link 
            href="/admin"
            className="px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-sm font-bold transition-all"
          >
            Voltar
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Novo Comunicado</h3>
                  <p className="text-xs text-gray-500">Isso enviará um sinal push para todos os aparelhos ativos.</p>
                </div>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Título do Alerta</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: 🎉 Novidade na FéConecta!"
                    className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl outline-none focus:ring-2 ring-whatsapp-teal/50 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Mensagem</label>
                  <textarea 
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="O que você deseja anunciar para a igreja hoje?"
                    className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl outline-none focus:ring-2 ring-whatsapp-teal/50 transition-all font-medium resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    disabled={sending}
                    className="w-full py-4 bg-whatsapp-teal hover:bg-whatsapp-tealDark disabled:opacity-50 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-whatsapp-teal/20 transition-all active:scale-[0.98]"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Disparando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Enviar Notificação Agora
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Stats e Sidebar */}
          <div className="space-y-6">
            <div className="bg-whatsapp-teal text-white p-6 rounded-3xl shadow-xl shadow-whatsapp-teal/20 relative overflow-hidden group">
               <Users className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
               <div className="relative z-10">
                  <p className="text-xs font-bold uppercase opacity-80 mb-1">Alcance Estimado</p>
                  <h2 className="text-4xl font-black mb-1">{stats.totalUsers}</h2>
                  <p className="text-[10px] font-medium opacity-70 italic">Perfis totais no sistema</p>
               </div>
            </div>

            <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl border border-gray-100 dark:border-white/5">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  Status do Sistema
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Firebase FCM</span>
                    <span className="flex items-center gap-1 text-green-500 font-bold">
                       <CheckCircle2 className="w-3 h-3" /> Online
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Supabase Edge</span>
                    <span className="flex items-center gap-1 text-green-500 font-bold">
                       <CheckCircle2 className="w-3 h-3" /> Online
                    </span>
                  </div>
                </div>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
               <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-500 leading-tight">
                    <strong>Atenção:</strong> Notificações em massa geram alto engajamento mas devem ser usadas com sabedoria para não incomodar os usuários.
                  </p>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
