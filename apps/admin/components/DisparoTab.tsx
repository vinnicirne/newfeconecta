import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Send, Users, UserPlus } from "lucide-react";

export function DisparoTab() {
  const [usersToEmail, setUsersToEmail] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [campaign, setCampaign] = useState<'welcome' | 'reengagement'>('welcome');
  
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
        query = query.lte('last_seen', threeDaysAgo.toISOString());
      }

      const { data: profiles, error: pError } = await query;
      
      const { data: logs, error: lError } = await supabase
        .from("email_logs")
        .select("email, status")
        .eq("template_key", campaign)
        .eq("status", "success");

      if (pError) throw pError;

      const sentEmails = new Set((logs || []).map(l => l.email));
      
      const pending = (profiles || []).filter(p => !sentEmails.has(p.email)).map(p => ({
        ...p,
        selected: true
      }));

      setUsersToEmail(pending);
    } catch (err: any) {
      toast.error("Erro ao buscar usuários: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [campaign]);

  const toggleSelect = (index: number) => {
    const updated = [...usersToEmail];
    updated[index].selected = !updated[index].selected;
    setUsersToEmail(updated);
  };

  const handleSendBatch = async () => {
    const selectedUsers = usersToEmail.filter(u => u.selected);
    
    if (selectedUsers.length === 0 && !manualEmail) {
      toast.error("Selecione pelo menos um usuário ou insira um email manual.");
      return;
    }

    const total = selectedUsers.length + (manualEmail ? 1 : 0);
    setSending(true);
    setSentCount(0);
    setTotalToSend(total);

    let successCount = 0;
    let errorCount = 0;

    // Disparo manual extra
    if (manualEmail) {
      try {
        const res = await fetch("/api/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: manualEmail, name: manualName || "Usuário", template_key: campaign })
        });
        if (res.ok) successCount++; else errorCount++;
      } catch {
        errorCount++;
      } finally {
        setSentCount(prev => prev + 1);
      }
    }

    // Disparo em lote
    for (const user of selectedUsers) {
      try {
        const res = await fetch("/api/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, name: user.full_name || user.username || "Membro", user_id: user.id, template_key: campaign })
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      } finally {
        setSentCount(prev => prev + 1);
      }
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
          onChange={(e) => setCampaign(e.target.value as any)}
          className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-whatsapp-teal outline-none"
        >
          <option value="welcome">Campanha: Boas Vindas (Novatos)</option>
          <option value="reengagement">Campanha: Saudades (Inativos &gt; 3 dias)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-4 h-4" /> Usuários Pendentes ({usersToEmail.length})
            </h3>
            <Button variant="outline" size="sm" onClick={fetchPendingUsers} disabled={loading} className="text-xs">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Recarregar"}
            </Button>
          </div>
          
          <div className="bg-black/50 rounded-lg p-2 max-h-[400px] overflow-y-auto border border-white/5 custom-scrollbar">
            {loading ? (
              <p className="text-gray-500 text-center py-4 text-xs">Buscando...</p>
            ) : usersToEmail.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-xs">Todos os usuários já receberam!</p>
            ) : (
              usersToEmail.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors" onClick={() => toggleSelect(i)}>
                  <input type="checkbox" checked={u.selected} onChange={() => {}} className="accent-whatsapp-teal" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{u.full_name || u.username || "Sem Nome"}</span>
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
              disabled={sending || (usersToEmail.filter(u => u.selected).length === 0 && !manualEmail)} 
              className="w-full bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-bold h-12 text-sm"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando {sentCount} de {totalToSend}...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Disparar Emails Selecionados</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
