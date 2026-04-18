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
  BookOpen,
  Wifi,
  WifiOff
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
  const [stats, setStats] = useState({ totalUsers: 0, activeTokens: 0 });
  const [systemStatus, setSystemStatus] = useState({ supabase: 'checking', firebase: 'online' });
  const { requestPermission, listenToForegroundMessages } = usePushNotifications();
  const [verseRef, setVerseRef] = useState("");
  const [pushType, setPushType] = useState<'broadcast' | 'verse_day'>('broadcast');

  useEffect(() => {
    const autoRegister = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await requestPermission(user.id);
          listenToForegroundMessages();
        }
        await loadStats();
        setSystemStatus(prev => ({ ...prev, supabase: 'online' }));
      } catch (err) {
        setSystemStatus(prev => ({ ...prev, supabase: 'offline' }));
      }
    };
    
    autoRegister();
  }, []);

  const loadStats = async () => {
    // Busca total de perfis
    const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    // Busca alcance real (quem tem token)
    const { count: tokens } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('fcm_token', 'is', null);

    setStats({ 
      totalUsers: total || 0, 
      activeTokens: tokens || 0 
    });
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return toast.error("Preencha todos os campos");

    setSending(true);
    try {
      // 1. Pegar perfis ativos com token
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .not('fcm_token', 'is', null)
        .limit(1000); // Guardrail de segurança para o frontend

      if (fetchError) throw fetchError;

      if (!profiles || profiles.length === 0) {
        toast.error("Nenhum usuário com notificações ativadas encontrado.");
        return;
      }

      // 2. Inserir notificações em massa
      const notifications = profiles.map(p => ({
        recipient_id: p.id,
        sender_id: '5034f23f-4197-4f1a-aa88-23e9fd26f1bf', // Fallback ID - Idealmente viria de uma var de ambiente env.ADMIN_PROFILE_ID
        type: pushType,
        title: title,
        content: message,
        metadata: pushType === 'verse_day' ? { bible_ref: verseRef } : { push_sync: true },
        is_read: false
      }));

      // Divisão em chunks para não estourar o limite de payload
      const chunkSize = 200;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(chunk);
        if (insertError) throw insertError;
      }

      // Log de Auditoria
      await supabase.from('system_errors').insert({
        module: 'admin_push',
        error_message: `[BROADCAST] ${pushType.toUpperCase()} disparado: ${title}`,
        metadata: { users_count: profiles.length, title }
      });

      toast.success(`Sinal emitido para ${profiles.length} fiéis!`);
      setTitle("");
      setMessage("");
      setVerseRef("");
      loadStats();
    } catch (err: any) {
      console.error("Erro ao disparar push:", err);
      toast.error("Falha na transmissão: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-whatsapp-dark text-gray-900 dark:text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto animate-in fade-in duration-700">
        
        {/* Header Premium */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-whatsapp-teal mb-2">
              <Megaphone className="w-5 h-5 animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Torre de Transmissão</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Voz da FéConecta</h1>
          </div>
          <Link 
            href="/admin"
            className="px-6 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
          >
            Sair do Console
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Console */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-2xl shadow-black/5">
              
              <div className="flex p-1.5 bg-gray-100 dark:bg-black/40 rounded-3xl mb-10 border border-black/5 dark:border-white/5">
                <button 
                  onClick={() => { setPushType('broadcast'); setTitle(""); }}
                  className={cn(
                    "flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all",
                    pushType === 'broadcast' ? "bg-white dark:bg-whatsapp-teal text-whatsapp-dark dark:text-white shadow-xl" : "text-gray-400"
                  )}
                >
                  Mensagem Geral
                </button>
                <button 
                  onClick={() => { setPushType('verse_day'); setTitle("📖 Palavra de Hoje"); }}
                  className={cn(
                    "flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all",
                    pushType === 'verse_day' ? "bg-white dark:bg-amber-500 text-whatsapp-dark dark:text-white shadow-xl" : "text-gray-400"
                  )}
                >
                  Ref. Bíblica
                </button>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-6">
                {pushType === 'verse_day' && (
                  <div className="animate-in slide-in-from-top-4 duration-500">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Vincular Passagem (Deep Link)</label>
                    <div className="relative mt-2">
                       <input 
                        type="text"
                        value={verseRef}
                        onChange={(e) => setVerseRef(e.target.value)}
                        placeholder="Ex: sl23:1"
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-black/20 border border-amber-500/20 rounded-3xl outline-none focus:ring-2 ring-amber-500/50 transition-all font-mono text-amber-600 dark:text-amber-400 font-bold"
                      />
                      <BookOpen className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-500/30" size={18} />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Título da Notificação</label>
                    <input 
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={pushType === 'verse_day' ? "Ex: 🕊️ Uma palavra para seu coração" : "Ex: 📢 Comunicado Importante!"}
                      className="w-full mt-2 px-6 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-3xl outline-none focus:ring-2 ring-whatsapp-teal/50 transition-all font-black text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Corpo da Mensagem</label>
                    <textarea 
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="O que o Espírito deseja falar hoje?"
                      className="w-full mt-2 px-6 py-4 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-3xl outline-none focus:ring-2 ring-whatsapp-teal/50 transition-all font-medium resize-none text-sm leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={sending}
                    className={cn(
                      "w-full py-5 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3",
                      pushType === 'verse_day' ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30" : "bg-whatsapp-dark dark:bg-whatsapp-teal hover:opacity-90 shadow-whatsapp-teal/30"
                    )}
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Sincronizando Satélites...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Emitir Sinal de Edificação
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-center mt-4 text-gray-400 font-bold uppercase tracking-widest">Broadcast Instantâneo para toda a rede</p>
                </div>
              </form>
            </div>
          </div>

          {/* Telemetry Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-whatsapp-teal text-whatsapp-dark p-8 rounded-[40px] shadow-2xl shadow-whatsapp-teal/20 relative overflow-hidden group border border-white/10">
               <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-black opacity-10 rounded-full group-hover:scale-125 transition-transform duration-1000" />
               <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-2">
                    <Wifi className="w-3 h-3" /> Alcance Real
                  </p>
                  <h2 className="text-5xl font-black mb-1">{stats.activeTokens}</h2>
                  <p className="text-[10px] font-bold opacity-60 uppercase">Dígitos ativos no sinal</p>
               </div>
            </div>

            <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-400">
                  <Wifi className="w-4 h-4" /> Telemetria de Resposta
                </h4>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Firebase FCM</span>
                    <span className="flex items-center gap-2 text-whatsapp-green font-black text-[10px] uppercase">
                       {systemStatus.firebase === 'online' ? <><CheckCircle2 size={12} /> Pronta</> : <><AlertCircle size={12} /> Fora</>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Supabase Signal</span>
                    <span className="flex items-center gap-2 font-black text-[10px] uppercase">
                       {systemStatus.supabase === 'online' ? <span className="text-whatsapp-green flex items-center gap-1"><CheckCircle2 size={12} /> Ativo</span> : <span className="text-red-500 flex items-center gap-1"><WifiOff size={12} /> Falha</span>}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-2">
                     <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase">Database Sync</span>
                        <span className="text-whatsapp-teal font-black text-[9px]">100% AUDITADO</span>
                     </div>
                  </div>
                </div>
            </div>

            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[32px]">
               <div className="flex gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 animate-pulse" />
                  <div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase leading-tight mb-1">Doutrina de Transmissão</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                      O abuso de notificações em massa pode levar os usuários a silenciar a voz da igreja. Use com sabedoria cristã.
                    </p>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
