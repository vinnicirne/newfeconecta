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
  WifiOff,
  Search,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { usePushNotifications } from "@/hooks/usePushNotifications";

const AVAILABLE_ROLES = [
  "Membro", "Líder", "Diácono", "Presbítero", "Evangelista", "Pastor", "Bispo", "Apóstolo", "Missionário", "Igreja"
];

export default function AdminPushCenter() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, activeTokens: 0 });
  const [systemStatus, setSystemStatus] = useState({ supabase: 'checking', firebase: 'checking', realtime: 'checking' });
  const { requestPermission, listenToForegroundMessages } = usePushNotifications();
  const [verseRef, setVerseRef] = useState("");
  const [pushType, setPushType] = useState<'broadcast' | 'verse_day'>('broadcast');

  // Audience State
  const [audienceType, setAudienceType] = useState<'all' | 'roles' | 'individuals' | 'fenamoro'>('all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  
  // Individual Selection State
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    const autoRegister = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthUserId(user.id);
          await requestPermission(user.id);
          listenToForegroundMessages();
          // listenToInternalNotifications já está ativo no auth-guard.tsx globalmente
          setSystemStatus(prev => ({ ...prev, firebase: 'online', realtime: 'online' }));
        }
        await loadStats();
        setSystemStatus(prev => ({ ...prev, supabase: 'online' }));
      } catch (err) {
        setSystemStatus(prev => ({ ...prev, supabase: 'offline', realtime: 'offline' }));
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (userSearchTerm.length > 2) {
        searchUsers(userSearchTerm);
      } else {
        setUserSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchTerm]);

  const searchUsers = async (term: string) => {
    setSearchingUsers(true);
    try {
      const cleanTerm = term.replace('@', '');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, role')
        .or(`full_name.ilike.%${cleanTerm}%,username.ilike.%${cleanTerm}%`)
        .limit(10);
      
      if (error) throw error;
      setUserSearchResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const addUser = (user: any) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setUserSearchTerm("");
    setUserSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (audienceType === 'roles' && selectedRoles.length === 0) {
      return toast.error("Selecione pelo menos um grupo/cargo");
    }
    if (audienceType === 'individuals' && selectedUsers.length === 0) {
      return toast.error("Selecione (clique) pelo menos um usuário na busca");
    }
    if (audienceType === 'fenamoro' && selectedGenders.length === 0) {
      return toast.error("Selecione se deseja enviar para homens, mulheres ou ambos.");
    }

    if (!title || !message) return toast.error("Preencha o título e a mensagem");

    setSending(true);
    try {
      // 1. Construir query baseada na audiência
      let query = supabase.from('profiles').select('id').not('fcm_token', 'is', null);

      if (audienceType === 'roles') {
        query = query.in('role', selectedRoles);
      } else if (audienceType === 'individuals') {
        query = query.in('id', selectedUsers.map(u => u.id));
      } else if (audienceType === 'fenamoro') {
        // Puxar apenas IDs que têm perfil no FéNamoro
        const { data: datingData } = await supabase.from('dating_profiles').select('id');
        const datingIds = datingData?.map((d: any) => d.id) || [];
        if (datingIds.length === 0) throw new Error("Nenhum usuário encontrado no FéNamoro.");
        
        query = query.in('id', datingIds).in('gender', selectedGenders);
      }

      const { data: profiles, error: fetchError } = await query.limit(1000); // Guardrail

      if (fetchError) throw fetchError;

      if (!profiles || profiles.length === 0) {
        toast.error("Nenhum usuário com notificações ativadas encontrado neste grupo.");
        return;
      }

      // 2. Gerar ID da Campanha para monitoramento
      const campaignId = crypto.randomUUID();

      // 3. Inserir notificações em massa
      const broadcastPayload = profiles.map(p => ({
        recipient_id: p.id,
        sender_id: authUserId, // Pegando o ID dinâmico do Dashboard Admin logado
        type: pushType,
        title: title,
        content: message,
        is_read: false,
        priority: 'high',
        metadata: {
          push_banner: true,
          sound: 'default',
          campaign_id: campaignId,
          audience_type: audienceType
        }
      }));

      const chunkSize = 200;
      for (let i = 0; i < broadcastPayload.length; i += chunkSize) {
        const chunk = broadcastPayload.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(chunk);
        if (insertError) throw insertError;
      }

      // Log de Auditoria
      await supabase.from('system_errors').insert({
        module: 'admin_push',
        error_message: `[BROADCAST] ${pushType.toUpperCase()} disparado: ${title}`,
        metadata: { users_count: profiles.length, title, campaign_id: campaignId, audience_type: audienceType }
      });

      toast.success(`Sinal emitido para ${profiles.length} fiéis!`);
      setTitle("");
      setMessage("");
      setVerseRef("");
      setSelectedUsers([]);
      setSelectedRoles([]);
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
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <div className="w-full md:w-auto">
            <div className="flex items-center gap-2 text-whatsapp-teal mb-2">
              <Megaphone className="w-5 h-5 animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Torre de Transmissão</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Voz da FéConecta</h1>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link 
              href="/admin/push/monitoring"
              className="flex-1 md:flex-none text-center px-6 py-3 bg-whatsapp-teal text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-sm"
            >
              Ver Monitoramento
            </Link>
            <Link 
              href="/admin"
              className="flex-1 md:flex-none text-center px-6 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
            >
              Voltar
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Console */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-2xl shadow-black/5">
              
              <div className="flex p-1.5 bg-gray-100 dark:bg-black/40 rounded-3xl mb-6 border border-black/5 dark:border-white/5">
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
                
                {/* Audiência (Alvo) */}
                <div className="space-y-3 bg-gray-50 dark:bg-black/10 p-5 rounded-3xl border border-gray-100 dark:border-white/5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Público Alvo (Audiência)</label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'roles', 'individuals', 'fenamoro'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAudienceType(type as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all",
                          audienceType === type 
                            ? "bg-whatsapp-dark dark:bg-white text-white dark:text-whatsapp-dark" 
                            : "bg-white dark:bg-white/5 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        {type === 'all' ? 'Toda a Rede' : type === 'roles' ? 'Por Cargos/Grupos' : type === 'individuals' ? 'Usuários Específicos' : 'FéNamoro (Match)'}
                      </button>
                    ))}
                  </div>

                  {/* Seleção de Grupos */}
                  {audienceType === 'roles' && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Selecione os cargos:</p>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_ROLES.map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleRole(r)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                              selectedRoles.includes(r) 
                                ? "bg-whatsapp-teal border-whatsapp-teal text-white" 
                                : "bg-transparent border-gray-200 dark:border-white/10 text-gray-500"
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seleção FéNamoro */}
                  {audienceType === 'fenamoro' && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Direcionar para perfis do Match:</p>
                      <div className="flex flex-wrap gap-2">
                        {['masculino', 'feminino'].map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setSelectedGenders(prev => prev.includes(g) ? prev.filter(r => r !== g) : [...prev, g])}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-bold uppercase border transition-all",
                              selectedGenders.includes(g) 
                                ? "bg-pink-500 border-pink-500 text-white" 
                                : "bg-transparent border-gray-200 dark:border-white/10 text-gray-500"
                            )}
                          >
                            {g === 'masculino' ? 'Homens' : 'Mulheres'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seleção Individual */}
                  {audienceType === 'individuals' && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          placeholder="Buscar por nome ou @usuario..."
                          className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 ring-whatsapp-teal/50 text-sm"
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        
                        {/* Resultados da busca */}
                        {userSearchResults.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#111b21] border border-gray-100 dark:border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                            {userSearchResults.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => addUser(u)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
                              >
                                <img src={u.avatar_url || 'https://via.placeholder.com/150'} alt="" className="w-8 h-8 rounded-full object-cover" />
                                <div className="text-left">
                                  <p className="text-sm font-bold dark:text-white">{u.full_name}</p>
                                  <p className="text-[10px] text-gray-400">@{u.username} • {u.role || 'Membro'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Lista de Selecionados */}
                      {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                          {selectedUsers.map(u => (
                            <div key={u.id} className="flex items-center gap-2 bg-gray-100 dark:bg-black/50 px-2 py-1 rounded-lg">
                              <span className="text-xs font-semibold">{u.full_name?.split(' ')[0]}</span>
                              <button type="button" onClick={() => removeUser(u.id)} className="text-gray-400 hover:text-red-500">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
                        Transmitindo...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {audienceType === 'all' ? 'Emitir Broadcast Global' : 'Emitir Push Direcionado'}
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-center mt-4 text-gray-400 font-bold uppercase tracking-widest">
                    O sinal chegará instantaneamente aos aparelhos conectados
                  </p>
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
                    <Wifi className="w-3 h-3" /> Alcance Máximo
                  </p>
                  <h2 className="text-5xl font-black mb-1">{stats.activeTokens}</h2>
                  <p className="text-[10px] font-bold opacity-60 uppercase">Dígitos ativos no sinal</p>
               </div>
            </div>

            <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-gray-400">
                  <Wifi className="w-4 h-4" /> Status dos Relays
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
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Realtime Signal</span>
                    <span className="flex items-center gap-2 font-black text-[10px] uppercase">
                       {systemStatus.realtime === 'online' ? <span className="text-whatsapp-green flex items-center gap-1"><CheckCircle2 size={12} /> Sincronizado</span> : <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={12} /> Reconectando</span>}
                    </span>
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
