"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  FileText, Plus, ExternalLink, Lock, Edit2, X, Save, RefreshCw, AlertTriangle, FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATIC_PAGES = [
  { title: "Termos de Uso",            slug: "/terms",       type: "legal" },
  { title: "Política de Privacidade",  slug: "/privacy",     type: "legal" },
  { title: "Política de Cookies",      slug: "/cookies",     type: "legal" },
  { title: "Publicidade",              slug: "/advertising", type: "content" },
  { title: "Sobre a FéConecta",        slug: "/about",       type: "content" },
];

export default function StaticPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('static_pages')
        .select('*');

      if (error) throw error;

      // Unificação de Rota e Merge de Dados
      const merged = STATIC_PAGES.map(p => {
        // Busca exata pelo slug padronizado
        const dbRow = data?.find((r: any) => r.slug === p.slug);
        return { 
          ...p, 
          content: dbRow?.content || "", 
          updated_at: dbRow?.updated_at || null, 
          id: dbRow?.id || null,
          char_count: dbRow?.content?.length || 0
        };
      });
      setPages(merged);
    } catch (err: any) {
      console.error("Erro no CMS:", err);
      toast.error(`Falha na fonte de dados: ${err.message}`);
      // Fallback seguro para exibição
      setPages(STATIC_PAGES.map(p => ({ ...p, content: "", updated_at: null, id: null, char_count: 0 })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, []);

  const openEditor = (page: any) => {
    setEditing(page);
    setEditContent(page.content || "");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        const { error } = await supabase
          .from('static_pages')
          .update({ 
            content: editContent, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('static_pages')
          .insert({ 
            slug: editing.slug, 
            title: editing.title, 
            content: editContent 
          });
        if (error) throw error;
      }

      // Auditoria de Mudança Institucional
      await supabase.from('system_errors').insert({
        module: 'cms_legal',
        error_message: `[CMS_PAGES] Atualização institucional: ${editing.title}`,
        metadata: { slug: editing.slug, user: 'admin_audit' }
      });

      toast.success(`"${editing.title}" propagada para o ambiente público! 🙌`);
      setEditing(null);
      fetchPages();
    } catch (err: any) {
      toast.error(`Erro crítico ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-12 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Arquitetura de Conteúdo"
        description="Gestão de pilares legais e páginas institucionais da FéConecta."
      >
        <button
          onClick={fetchPages}
          className="p-3 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className={cn("w-5 h-5", loading ? "animate-spin text-whatsapp-teal" : "text-gray-400")} />
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {pages.map((page) => (
          <div
            key={page.slug}
            className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] group transition-all hover:border-whatsapp-teal/30"
          >
            <div className="flex items-start justify-between mb-6">
              <div className={cn(
                "p-4 rounded-2xl transition-all group-hover:scale-110",
                page.type === "legal" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
              )}>
                {page.type === "legal" ? <Lock size={20} /> : <FileText size={20} />}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={page.slug}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:text-whatsapp-teal transition-all"
                  title="Abrir página pública"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => openEditor(page)}
                  className="p-3 rounded-xl bg-whatsapp-teal/10 text-whatsapp-teal hover:bg-whatsapp-teal hover:text-white transition-all shadow-md active:scale-90"
                  title="Editar estrutura"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>

            <h4 className="font-black text-whatsapp-dark dark:text-white text-lg mb-1 leading-tight">{page.title}</h4>
            <p className="text-[10px] font-black text-whatsapp-teal/60 dark:text-whatsapp-green/60 uppercase tracking-widest font-mono mb-4">{page.slug}</p>

            <div className="text-xs text-gray-400 italic mb-6 line-clamp-3 min-h-[48px] leading-relaxed">
              {page.content || "Nenhum conteúdo definido. Esta página está atualmente vazia e pode impactar o compliance legal."}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-white/5">
              <div className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", page.content ? "bg-whatsapp-green animate-pulse" : "bg-orange-400")} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{page.content ? "Auditado" : "Vazio"}</span>
                 </div>
                 <span className="text-[9px] font-bold text-gray-400">{page.char_count} caracteres</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase">Última Versão</p>
                <p className="text-[10px] text-gray-500 font-bold italic">
                  {page.updated_at ? new Date(page.updated_at).toLocaleDateString('pt-BR') : "Inexistente"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[40px] border-white/5 bg-gray-50 dark:bg-[#0f0f0f]">
          <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-whatsapp-darkLighter">
             <div>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                    <FileCheck className="text-whatsapp-teal" />
                    Editor Legal: {editing?.title}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Diretório: {editing?.slug}</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-whatsapp-teal uppercase">Telemetria de Conteúdo</p>
                <p className="text-sm font-black dark:text-white">{editContent.length} <span className="text-[10px] text-gray-500">chars</span></p>
             </div>
          </div>
          
          <div className="p-8">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[450px] bg-transparent text-gray-800 dark:text-gray-100 text-sm p-0 border-none outline-none resize-none font-mono leading-relaxed placeholder:text-gray-300 dark:placeholder:text-gray-700"
              placeholder="Inicie a redação da página usando Markdown..."
            />
          </div>

          <div className="p-6 bg-white dark:bg-whatsapp-darkLighter border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-500">
               <AlertTriangle size={14} />
               <span className="text-[9px] font-black uppercase tracking-widest">Alterações impactam o ambiente público imediatamente.</span>
            </div>
            <div className="flex items-center gap-3">
              <DialogClose asChild>
                <button className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">Cancelar</button>
              </DialogClose>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 rounded-2xl bg-whatsapp-teal text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-whatsapp-teal/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {saving ? "Publicando..." : "Sincronizar Página"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
