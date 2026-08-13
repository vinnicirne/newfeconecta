"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, History, Code, Save, Loader2, RefreshCw, CheckCircle, XCircle, Maximize2, Minimize2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DisparoTab } from "@/components/DisparoTab";

export default function EmailsAdminPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'disparo'>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Templates error:", error);
      toast.error("Erro ao carregar templates: " + error.message);
    } else {
      setTemplates(data || []);
      if (data && data.length > 0 && !editingTemplate) {
        setEditingTemplate(data[0]);
      }
    }
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error("Logs error:", error);
      toast.error("Erro ao carregar logs: " + error.message);
    } else {
      setLogs(data || []);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editingTemplate.subject,
          html_content: editingTemplate.html_content,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTemplate.id);
      
      if (error) throw error;
      toast.success("Template salvo com sucesso!");
      await fetchTemplates();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-whatsapp-teal" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Mail className="w-8 h-8 text-whatsapp-teal" /> Sistema de E-mails
          </h1>
          <p className="text-gray-400 mt-1">Gerencie os templates de e-mail e visualize o histórico de disparos</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2 bg-transparent border-white/10 text-white">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'templates' ? 'bg-whatsapp-teal/20 text-whatsapp-teal' : 'text-gray-400 hover:text-white'}`}
        >
          <Code className="w-4 h-4" /> Templates (HTML)
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'logs' ? 'bg-whatsapp-teal/20 text-whatsapp-teal' : 'text-gray-400 hover:text-white'}`}
        >
          <History className="w-4 h-4" /> Histórico de Disparos
        </button>
        <button
          onClick={() => setActiveTab('disparo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'disparo' ? 'bg-whatsapp-teal/20 text-whatsapp-teal' : 'text-gray-400 hover:text-white'}`}
        >
          <Send className="w-4 h-4" /> Enviar (Disparo)
        </button>
      </div>

      {activeTab === 'templates' && editingTemplate && (
        <div className={isExpanded 
          ? "fixed inset-0 z-50 bg-[#0a0a0a] p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 h-[100dvh] w-screen overflow-hidden" 
          : "grid grid-cols-1 lg:grid-cols-2 gap-6"
        }>
          <div className={`bg-[#111] border border-white/10 rounded-xl p-4 flex flex-col ${isExpanded ? 'h-full' : 'h-[70vh]'}`}>
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Chave / Identificador</label>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-md flex items-center gap-2 text-xs"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {isExpanded ? "Sair da Tela Cheia" : "Expandir Editor"}
              </button>
            </div>
            <div className="mb-4">
              <input type="text" value={editingTemplate.key} disabled className="w-full bg-black/50 border border-white/5 rounded-lg px-3 py-2 text-white/50 text-sm" />
            </div>
            
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Assunto do E-mail</label>
              <input 
                type="text" 
                value={editingTemplate.subject} 
                onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-whatsapp-teal outline-none" 
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Código HTML</label>
              <textarea 
                value={editingTemplate.html_content}
                onChange={e => setEditingTemplate({...editingTemplate, html_content: e.target.value})}
                className="w-full flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg p-4 text-green-400 font-mono text-xs focus:border-whatsapp-teal outline-none resize-none"
                spellCheck={false}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveTemplate} disabled={saving} className="bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-bold">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Alterações
              </Button>
            </div>
          </div>

          <div className={`bg-white rounded-xl flex flex-col overflow-hidden shadow-2xl relative ${isExpanded ? 'h-full' : 'h-[70vh]'}`}>
            <div className="bg-gray-100 border-b border-gray-200 p-3 flex gap-2">
               <div className="w-3 h-3 rounded-full bg-red-400" />
               <div className="w-3 h-3 rounded-full bg-yellow-400" />
               <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="p-4 bg-gray-50 border-b border-gray-200">
               <div className="text-sm text-black"><strong>De:</strong> FéConecta &lt;contato@feconecta.com.br&gt;</div>
               <div className="text-sm text-black"><strong>Assunto:</strong> {editingTemplate.subject}</div>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              {/* iframe isolado para não sujar o CSS do painel com o HTML do email */}
              <iframe 
                className="w-full h-full border-0" 
                srcDoc={`<base target="_blank" />${editingTemplate.html_content.replace(/{{name}}/g, 'João da Silva')}`}
                title="Preview"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'disparo' && <DisparoTab />}

      {activeTab === 'logs' && (
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#1a1a1a] text-xs uppercase text-gray-500 font-black">
              <tr>
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Destinatário</th>
                <th className="px-6 py-4">Template</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Detalhes do Resend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum disparo registrado.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(log.sent_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {log.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-white/10 text-white px-2 py-1 rounded-md text-xs font-mono">{log.template_key}</span>
                  </td>
                  <td className="px-6 py-4">
                    {log.status === 'success' ? (
                      <span className="flex items-center gap-1 text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded-md w-fit">
                        <CheckCircle className="w-4 h-4" /> Sucesso
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-md w-fit">
                        <XCircle className="w-4 h-4" /> Falha
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 max-w-xs truncate" title={log.error_message || 'OK'}>
                    {log.error_message || 'OK'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
