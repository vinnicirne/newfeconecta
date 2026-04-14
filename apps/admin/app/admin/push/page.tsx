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
  LayoutDashboard,
  BookOpen
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function AdminPushCenter() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, sentLast24h: 0 });
  const { requestPermission, listenToForegroundMessages } = usePushNotifications();
  const [verseRef, setVerseRef] = useState("");
  const [pushType, setPushType] = useState<'broadcast' | 'verse_day'>('broadcast');

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
        sender_id: '5034f23f-4197-4f1a-aa88-23e9fd26f1bf', // Perfil Oficial FéConecta
        type: pushType,
        title: title,
        content: message,
        metadata: pushType === 'verse_day' ? { bible_ref: verseRef } : {},
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      toast.success(`Push enviado para ${profiles.length} usuários!`);
      setTitle("");
      setMessage("");
      setVerseRef("");
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
              
              {/* SELETOR DE MODO */}
              <div className="flex p-1.5 bg-gray-100 dark:bg-black/20 rounded-2xl mb-8">
                <button 
                  onClick={() => { setPushType('broadcast'); setTitle(""); }}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                    pushType === 'broadcast' ? "bg-white dark:bg-whatsapp-teal text-whatsapp-teal dark:text-white shadow-sm" : "text-gray-400"
                  )}
                >
                  Comunicado Geral
                </button>
                <button 
                  onClick={() => { setPushType('verse_day'); setTitle("📖 Promessa de Hoje"); }}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                    pushType === 'verse_day' ? "bg-white dark:bg-amber-500 text-amber-500 dark:text-white shadow-sm" : "text-gray-400"
                  )}
                >
                  Versículo do Dia
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  pushType === 'verse_day' ? "bg-amber-500/10 text-amber-500" : "bg-whatsapp-teal/10 text-whatsapp-teal"
                )}>
                  {pushType === 'verse_day' ? <BookOpen className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold">{pushType === 'verse_day' ? "Compartilhar Palavra" : "Novo Comunicado"}</h3>
                  <p className="text-xs text-gray-500">
                    {pushType === 'verse_day' ? "Irá para a aba Bíblia ao clicar." : "Irá abrir o Feed inicial ao clicar."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-4">
                {pushType === 'verse_day' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold uppercase text-gray-400 ml-1">Referência Bíblica (Link Profundo)</label>
                    <input 
                      type="text"
                      value={verseRef}
                      onChange={(e) => setVerseRef(e.target.value)}
                      placeholder="Ex: sl23:1 ou mt5:1-12"
                      className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-amber-500/20 rounded-2xl outline-none focus:ring-2 ring-amber-500/50 transition-all font-mono text-amber-600 dark:text-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Título do Alerta</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={pushType === 'verse_day' ? "Ex: 📖 Promessa para Você" : "Ex: 🎉 Novidade na FéConecta!"}
                    className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl outline-none focus:ring-2 ring-whatsapp-teal/50 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Mensagem</label>
                  <textarea 
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={pushType === 'verse_day' ? "O versículo do dia que será exibido no corpo do push..." : "O que você deseja anunciar para a igreja hoje?"}
                    className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl outline-none focus:ring-2 ring-whatsapp-teal/50 transition-all font-medium resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    disabled={sending}
                    className={cn(
                      "w-full py-4 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98]",
                      pushType === 'verse_day' ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-whatsapp-teal hover:bg-whatsapp-tealDark shadow-whatsapp-teal/20"
                    )}
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Disparando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {pushType === 'verse_day' ? "Disparar Versículo" : "Enviar Notificação Agora"}
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
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-white/5">
                    <span className="text-gray-500">Redirecionamento</span>
                    <span className="flex items-center gap-1 text-whatsapp-teal font-bold uppercase text-[9px]">
                       <CheckCircle2 className="w-3 h-3" /> Ativo (Deep link)
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
