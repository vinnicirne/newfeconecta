"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Plus, Search, Megaphone, Trash2, Edit2, Play, Square, Image as ImageIcon, Link as LinkIcon, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import moment from "moment";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

type Campaign = {
  id: string;
  title: string;
  type: 'banner' | 'popup';
  content: string;
  image_url: string;
  link_url: string;
  button_text: string;
  target_app: 'feconecta' | 'fenamoro' | 'ambos';
  is_active: boolean;
  created_at: string;
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Campaign>>({
    type: 'banner',
    target_app: 'ambos',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error("Erro ao carregar campanhas");
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Salvando campanha...");

    try {
      if (formData.id) {
        const { error } = await supabase
          .from('marketing_campaigns')
          .update(formData)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_campaigns')
          .insert(formData);
        if (error) throw error;
      }

      toast.success("Campanha salva com sucesso!", { id: toastId });
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    const toastId = toast.loading("Excluindo...");
    try {
      const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
      if (error) throw error;
      toast.success("Excluído com sucesso!", { id: toastId });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message, { id: toastId });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
      toast.success(!currentStatus ? "Campanha ATIVADA!" : "Campanha DESATIVADA!");
    } catch (err: any) {
      toast.error("Erro ao mudar status: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full pb-8">
      <PageHeader 
        title="Marketing & Avisos" 
        description="Crie banners informativos e popups promocionais para engajar sua base de usuários."
      >
        <button 
          onClick={() => {
            setFormData({ type: 'banner', target_app: 'ambos', is_active: true });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all active:scale-95 shadow-lg shadow-whatsapp-teal/20"
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </PageHeader>

      <div className="flex-1 mt-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 border-dashed">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-bold text-gray-500 mb-2">Nenhuma campanha criada</h3>
            <p className="text-sm text-gray-400">Use os banners e popups para avisar sobre eventos ou redirecionar usuários.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {campaigns.map(camp => (
              <div key={camp.id} className={cn(
                "bg-white dark:bg-whatsapp-darkLighter rounded-2xl border transition-all overflow-hidden relative group flex flex-col",
                camp.is_active ? "border-whatsapp-green/30 shadow-lg shadow-whatsapp-green/5" : "border-gray-200 dark:border-white/5 opacity-70"
              )}>
                {camp.image_url ? (
                  <div className="h-32 bg-gray-100 dark:bg-black/20 w-full overflow-hidden">
                    <img src={camp.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-2 bg-gradient-to-r from-whatsapp-teal to-whatsapp-green" />
                )}
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mb-2 inline-block",
                        camp.type === 'popup' ? "bg-purple-100 text-purple-600 dark:bg-purple-500/20" : "bg-blue-100 text-blue-600 dark:bg-blue-500/20"
                      )}>
                        {camp.type}
                      </span>
                      <h3 className="font-bold text-lg leading-tight dark:text-white">{camp.title}</h3>
                    </div>
                    <button onClick={() => toggleActive(camp.id, camp.is_active)} className="p-2 -mr-2 text-gray-400 hover:text-whatsapp-green transition-colors">
                      {camp.is_active ? <Play className="w-5 h-5 text-whatsapp-green fill-whatsapp-green" /> : <Square className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{camp.content}</p>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-md dark:text-gray-300">
                      🎯 {camp.target_app === 'ambos' ? 'Rede Global' : camp.target_app}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => { setFormData(camp); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-white/5 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(camp.id)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-white/5 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <DialogPrimitive.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] p-4 focus:outline-none">
            <div className="bg-white dark:bg-whatsapp-darkLighter rounded-3xl p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold dark:text-white">
                  {formData.id ? 'Editar Campanha' : 'Nova Campanha'}
                </h2>
                <DialogPrimitive.Close className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 dark:text-gray-400" />
                </DialogPrimitive.Close>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome Interno</label>
                  <input required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border-none text-sm dark:text-white focus:ring-2 focus:ring-whatsapp-green/30" placeholder="Ex: Black Friday Assinatura" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Formato</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border-none text-sm dark:text-white focus:ring-2 focus:ring-whatsapp-green/30">
                      <option value="banner">Banner (Topo)</option>
                      <option value="popup">Popup (Modal Central)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Público Alvo</label>
                    <select value={formData.target_app} onChange={e => setFormData({...formData, target_app: e.target.value as any})} className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border-none text-sm dark:text-white focus:ring-2 focus:ring-whatsapp-green/30">
                      <option value="ambos">Rede Global (Ambos)</option>
                      <option value="feconecta">Apenas FéConecta</option>
                      <option value="fenamoro">Apenas FéNamoro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Conteúdo / Texto</label>
                  <textarea required value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} rows={3} className="w-full mt-1 px-4 py-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border-none text-sm dark:text-white focus:ring-2 focus:ring-whatsapp-green/30 resize-none custom-scrollbar" placeholder="Mensagem principal do banner..." />
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Imagem URL (Opcional)</label>
                      <input value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border-none text-sm dark:text-white" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-[2]">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Link de Destino (Opcional)</label>
                      <input value={formData.link_url || ''} onChange={e => setFormData({...formData, link_url: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border-none text-sm dark:text-white" placeholder="Ex: /pricing ou https://..." />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Texto Botão</label>
                      <input value={formData.button_text || ''} onChange={e => setFormData({...formData, button_text: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border-none text-sm dark:text-white" placeholder="Saiba mais" />
                    </div>
                  </div>
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full py-4 mt-6 bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white rounded-xl font-bold text-sm shadow-xl shadow-whatsapp-teal/20 transition-all active:scale-95 flex justify-center items-center">
                  {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Salvar Campanha"}
                </button>
              </form>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
