import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Send, Users, UserPlus } from "lucide-react";

interface UserToEmail {
  id: string;
  full_name: string | null;
  email: string;
  username: string | null;
  last_seen: string | null;
  hasReceived: boolean;
  selected: boolean;
}

export function DisparoTab() {
  const [usersToEmail, setUsersToEmail] = useState<UserToEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [campaign, setCampaign] = useState<'welcome' | 'reengagement' | 'mensagem_do_dia'>('mensagem_do_dia');
  
  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, username, last_seen")
        .not("email", "is", null);

      if (campaign === 'reengagement') {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        query = query.or(`last_seen.lte.${threeDaysAgo.toISOString()},last_seen.is.null`);
      }

      const { data: profiles, error: pError } = await query;
      
      const { data: logs, error: lError } = await supabase
        .from("email_logs")
        .select("email, status")
        .eq("template_key", campaign)
        .eq("status", "success");

      if (pError) throw pError;
      if (lError) throw lError;

      const sentEmails = new Set((logs || []).map(l => l.email));
      
      const allUsers = (profiles || []).map(p => {
        const received = sentEmails.has(p.email);
        return {
          ...p,
          hasReceived: received,
          selected: !received
        };
      });

      setUsersToEmail(allUsers);
    } catch (err: any) {
      toast.error("Erro ao buscar usuários: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [campaign]);

  const toggleSelect = (userId: string) => {
    setUsersToEmail(prev => prev.map(u => u.id === userId ? { ...u, selected: !u.selected } : u));
  };

  const selectAllPending = () => {
    setUsersToEmail(prev => prev.map(u => ({ ...u, selected: !u.hasReceived })));
  };

  const selectAll = () => {
    setUsersToEmail(prev => prev.map(u => ({ ...u, selected: true })));
  };

  const deselectAll = () => {
    setUsersToEmail(prev => prev.map(u => ({ ...u, selected: false })));
  };

  const selectedCount = usersToEmail.filter(u => u.selected).length;

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSendBatch = async () => {
    const selectedUsers = usersToEmail.filter(u => u.selected);
    
    if (selectedUsers.length === 0 && !manualEmail) {
      toast.error("Selecione pelo menos um usuário ou insira um email manual.");
      return;
    }

    if (manualEmail && !isValidEmail(manualEmail)) {
      toast.error("E-mail avulso inválido.");
      return;
    }

    const total = selectedUsers.length + (manualEmail ? 1 : 0);

    if (total > 25 && !window.confirm(`Tem certeza que deseja enviar ${total} e-mails?`)) {
      return;
    }

    setSending(true);
    setSentCount(0);
    setTotalToSend(total);

    let successCount = 0;
    let errorCount = 0;

    const sendOne = async (payload: Record<string, any>) => {
      try {
        const res = await fetch("/api/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error("Falha no envio:", data?.error || res.statusText);
        }
      } catch (err) {
        errorCount++;
        console.error(err);
      } finally {
        setSentCount(prev => prev + 1);
      }
    };

    // Disparo manual extra
    if (manualEmail) {
      await sendOne({ email: manualEmail.trim(), name: manualName || "Usuário", template_key: campaign });
    }

    // Disparo em lote
    for (const user of selectedUsers) {
      await sendOne({ email: user.email, name: user.full_name || user.username || "Membro", user_id: user.id, template_key: campaign });
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setSending(false);
    if (successCount > 0) toast.success(`${successCount} email(s) enviado(s) com sucesso!`);
    if (errorCount > 0) toast.error(`${errorCount} email(s) falharam.`);
    
    setManualEmail("");
    setManualName("");
    fetchPendingUsers();
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-whatsapp-teal" />
          <h2 className="text-xl font-bold text-white">Disparo Manual</h2>
        </div>
        <select 
          value={campaign} 
          onChange={(e) => setCampaign(e.target.value as 'welcome' | 'reengagement' | 'mensagem_do_dia')}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-whatsapp-teal outline-none"
        >
          <option value="mensagem_do_dia">Campanha: Mensagem do Dia (Devocional)</option>
          <option value="welcome">Campanha: Boas Vindas (Novatos)</option>
          <option value="reengagement">Campanha: Saudades (Inativos &gt; 3 dias)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                <Users className="w-4 h-4" /> Usuários da Base ({usersToEmail.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-[10px] h-7 px-2 text-whatsapp-teal">
                  Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={selectAllPending} className="text-[10px] h-7 px-2 text-whatsapp-teal">
                  Só Pendentes
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="text-[10px] h-7 px-2 text-gray-500">
                  Nenhum
                </Button>
                <Button variant="outline" size="sm" onClick={fetchPendingUsers} disabled={loading} className="text-xs h-7">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Recarregar"}
                </Button>
              </div>
            </div>
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-whatsapp-teal outline-none"
            />
          </div>
          
          <div className="bg-black/50 rounded-lg p-2 max-h-[400px] overflow-y-auto border border-white/5 custom-scrollbar">
            {loading ? (
              <p className="text-gray-500 text-center py-4 text-xs">Buscando...</p>
            ) : usersToEmail.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-xs">Nenhum usuário encontrado na base.</p>
            ) : (
              usersToEmail
                .filter(u => 
                  (u.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                  (u.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                  (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
                )
                .map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors" onClick={() => toggleSelect(u.id)}>
                    <input 
                      type="checkbox" 
                      checked={u.selected} 
                      onChange={() => toggleSelect(u.id)} 
                      onClick={(e) => e.stopPropagation()} 
                      className="accent-whatsapp-teal" 
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">
                        {u.full_name || u.username || "Sem Nome"}
                        {u.hasReceived && <span className="ml-2 text-[10px] bg-whatsapp-teal/20 text-whatsapp-teal px-1.5 py-0.5 rounded uppercase tracking-wider">Já recebeu</span>}
                      </span>
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
            <UserPlus className="w-4 h-4" /> Adicionar Email Avulso
          </h3>
          
          <div className="space-y-3 bg-black/30 p-4 rounded-lg border border-white/5">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome do Usuário</label>
              <input 
                type="text" 
                value={manualName} 
                onChange={e => setManualName(e.target.value)} 
                placeholder="Ex: João da Silva"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-whatsapp-teal outline-none" 
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
              <input 
                type="email" 
                value={manualEmail} 
                onChange={e => setManualEmail(e.target.value)} 
                placeholder="Ex: joao@email.com"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-whatsapp-teal outline-none" 
              />
            </div>
          </div>

          <div className="pt-6">
            <Button 
              onClick={handleSendBatch} 
              disabled={sending || (selectedCount === 0 && !manualEmail)} 
              className="w-full bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-bold h-12 text-sm"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando {sentCount} de {totalToSend}...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Disparar ({selectedCount + (manualEmail ? 1 : 0)} selecionados)</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
