"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  FileText, Plus, ExternalLink, Lock, Edit2, X, Save, RefreshCw, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATIC_PAGES = [
  { title: "Termos de Uso",            slug: "/terms",       key: "terms",       type: "legal" },
  { title: "Política de Privacidade",  slug: "/privacy",     key: "privacy",     type: "legal" },
  { title: "Política de Cookies",      slug: "/cookies",     key: "cookies",     type: "legal" },
  { title: "Publicidade",              slug: "/advertising", key: "advertising", type: "content" },
  { title: "Sobre a FéConecta",        slug: "/about",       key: "about",       type: "content" },
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
      const { data } = await supabase
        .from('static_pages')
        .select('*');

      // Mesclar dados do banco com a lista fixa de páginas
      const merged = STATIC_PAGES.map(p => {
        const dbRow = data?.find((r: any) => r.slug === p.key || r.slug === p.slug);
        return { ...p, content: dbRow?.content || "", updated_at: dbRow?.updated_at || null, id: dbRow?.id || null };
      });
      setPages(merged);
    } catch (err) {
      // Se a tabela ainda não existe, usa a lista estática sem conteúdo
      setPages(STATIC_PAGES.map(p => ({ ...p, content: "", updated_at: null, id: null })));
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
        // UPDATE
        const { error } = await supabase
          .from('static_pages')
          .update({ content: editContent, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase
          .from('static_pages')
          .insert({ slug: editing.key, title: editing.title, content: editContent });
        if (error) throw error;
      }
      toast.success(`"${editing.title}" salva com sucesso!`);
      setEditing(null);
      fetchPages();
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-12">
      <PageHeader
        title="Páginas Legais e Institucionais"
        description="Gerencie o conteúdo das páginas públicas da plataforma."
      >
        <button
          onClick={fetchPages}
          className="p-2 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading ? "animate-spin text-whatsapp-teal" : "text-gray-400")} />
        </button>
      </PageHeader>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
        {pages.map((page) => (
          <div
            key={page.key}
            className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm group hover:border-whatsapp-green/40 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-whatsapp-light dark:bg-whatsapp-dark rounded-xl">
                {page.type === "legal"
                  ? <Lock className="w-5 h-5 text-purple-500" />
                  : <FileText className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={page.slug}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  title="Ver página"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
                <button
                  onClick={() => openEditor(page)}
                  className="p-2 rounded-lg bg-whatsapp-teal/10 hover:bg-whatsapp-teal/20 transition-colors"
                  title="Editar conteúdo"
                >
                  <Edit2 className="w-4 h-4 text-whatsapp-teal" />
                </button>
              </div>
            </div>

            <h4 className="font-bold dark:text-white text-base mb-1">{page.title}</h4>
            <p className="text-xs text-whatsapp-teal dark:text-whatsapp-green font-mono mb-3">{page.slug}</p>

            <div className="text-[11px] text-gray-400 italic truncate min-h-[16px]">
              {page.content ? page.content.substring(0, 80) + "..." : (
                <span className="flex items-center gap-1 text-orange-400">
                  <AlertTriangle className="w-3 h-3" /> Sem conteúdo cadastrado
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-50 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", page.content ? "bg-whatsapp-green" : "bg-orange-400")} />
                <span className="text-[10px] font-bold uppercase text-gray-500">{page.content ? "publicado" : "vazio"}</span>
              </div>
              <span className="text-[10px] text-gray-400 italic">
                {page.updated_at
                  ? new Date(page.updated_at).toLocaleDateString('pt-BR')
                  : "Nunca atualizado"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-whatsapp-teal" />
              Editar: {editing?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 font-mono mb-2">{editing?.slug}</p>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[320px] bg-gray-50 dark:bg-whatsapp-dark border border-gray-100 dark:border-white/10 rounded-xl p-4 text-sm text-gray-800 dark:text-white resize-y outline-none focus:ring-2 focus:ring-whatsapp-teal/30 font-mono"
            placeholder="Escreva o conteúdo da página aqui..."
          />
          <div className="flex items-center justify-end gap-3 mt-2">
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                <X className="w-4 h-4" /> Cancelar
              </button>
            </DialogClose>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-whatsapp-teal text-white text-sm font-bold shadow-lg hover:bg-whatsapp-tealLight transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Página"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
