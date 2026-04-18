"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  GripVertical,
  RefreshCw,
  X,
  Save,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  order_index: number;
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  
  // Modal states
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", category: "Geral" });

  useEffect(() => { fetchFaqs(); }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) {
        // Erro 42P01: undefined_table no PostgreSQL
        if (error.code === '42P01') {
          setTableExists(false);
          return;
        }
        throw error;
      }
      
      setTableExists(true);
      setFaqs(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar FAQ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) throw error;
      setFaqs(faqs.map(f => f.id === id ? { ...f, is_active: !current } : f));
      toast.success("Visibilidade atualizada!");
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta pergunta?")) return;
    try {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      setFaqs(faqs.filter(f => f.id !== id));
      toast.success("Pergunta removida");
    } catch (err: any) {
      toast.error("Erro ao excluir");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing?.id) {
        // Update
        const { error } = await supabase
          .from('faqs')
          .update({ ...form })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('faqs')
          .insert({ ...form, is_active: true, order_index: faqs.length });
        if (error) throw error;
      }
      toast.success("FAQ sincronizado com sucesso! 🙌");
      setEditing(null);
      fetchFaqs();
    } catch (err: any) {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const seedInitialFaqs = async () => {
    setLoading(true);
    const initialFaqs = [
      { 
        question: 'O que é a FéConecta?', 
        answer: 'A FéConecta é uma plataforma de tecnologia cristã focada em adoração, comunhão e edificação do corpo de Cristo. Unimos ferramentas de redes sociais com recursos de ministério para fortalecer sua caminhada com Deus.', 
        category: 'Geral' 
      },
      { 
        question: 'As Salas de Guerra (War Rooms) são seguras?', 
        answer: 'Sim. Todas as Salas de Guerra são monitoradas por algoritmos de segurança e pela nossa equipe de moderação. Garantimos um ambiente de paz focado exclusivamente em oração e intercessão.', 
        category: 'Segurança' 
      },
      { 
        question: 'Como funciona a verificação de Ministérios e Igrejas?', 
        answer: 'Igrejas e líderes ministeriais podem solicitar o selo de verificação enviando a documentação comprobatória através do painel de configurações. Isso garante credibilidade e segurança aos membros da rede.', 
        category: 'Perfil' 
      },
      { 
        question: 'Como faço para ler a Bíblia sem internet?', 
        answer: 'O aplicativo da FéConecta possui a base da Bíblia NVI integrada no código. Você pode realizar leituras e buscas de versículos mesmo quando estiver em modo offline ou em locais com sinal fraco.', 
        category: 'Perfil' 
      },
      { 
        question: 'As doações e dízimos são processados pela plataforma?', 
        answer: 'A FéConecta facilita a conexão com o seu ministério local. Em breve, disponibilizaremos ferramentas de dízimo digital com taxas reduzidas para apoiar a obra missionária em todo o mundo.', 
        category: 'Pagamentos' 
      },
      { 
        question: 'O que é considerado conduta imprópria na rede?', 
        answer: 'Qualquer conteúdo que fira os princípios bíblicos, promova ódio, divisão ou imoralidade será removido. Prezamos pela santidade e pelo respeito mútuo em todas as interações.', 
        category: 'Segurança' 
      },
      { 
        question: 'Como as notificações de alerta funcionam?', 
        answer: 'Notificações urgentes (Push) são usadas para convocar a rede para clamores nacionais, atualizações ministeriais importantes ou alertas de segurança da comunidade cristã.', 
        category: 'Geral' 
      }
    ];

    try {
      const { error } = await supabase
        .from('faqs')
        .insert(initialFaqs.map((f, i) => ({ ...f, is_active: true, order_index: i })));
      
      if (error) throw error;
      toast.success("FAQ populado com sucesso!");
      fetchFaqs();
    } catch (err: any) {
      toast.error("Erro ao semear dados: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter(f => {
    const matchesSearch = f.question.toLowerCase().includes(search.toLowerCase()) || 
                         f.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "Todos" || f.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-12 space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Gestão de FAQ" 
        description="Central de conhecimento e suporte autoatendimento aos fiéis."
      >
        <div className="flex gap-2">
           <button 
             onClick={fetchFaqs}
             className="p-3 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 transition-all shadow-sm"
           >
             <RefreshCw className={cn("w-5 h-5", loading ? "animate-spin text-whatsapp-teal" : "text-gray-400")} />
           </button>
           <button 
             onClick={() => { setEditing({} as FAQ); setForm({ question: "", answer: "", category: "Geral" }); }}
             className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-xl shadow-whatsapp-teal/20 transition-all"
           >
            <Plus size={16} /> Nova Pergunta
          </button>
        </div>
      </PageHeader>

      {/* Categories & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquise por termos ou palavras-chave..."
            className="w-full bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-3xl pl-12 pr-6 py-4 text-sm font-medium focus:ring-2 focus:ring-whatsapp-green/20 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
           {["Todos", "Geral", "Pagamentos", "Segurança", "Perfil"].map((cat) => (
             <button 
               key={cat} 
               onClick={() => setCategory(cat)}
               className={cn(
                "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                cat === category ? "bg-whatsapp-dark dark:bg-whatsapp-teal text-white shadow-lg" : "bg-white dark:bg-whatsapp-darkLighter text-gray-400 border border-gray-100 dark:border-white/5 hover:bg-gray-50"
              )}
             >
               {cat}
             </button>
           ))}
        </div>
      </div>

      {loading ? (
         <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-white/5 rounded-[32px] animate-pulse border border-white/5" />
            ))}
         </div>
      ) : !tableExists ? (
        <div className="py-16 px-8 text-center bg-white dark:bg-whatsapp-darkLighter rounded-[40px] border border-gray-100 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
              <AlertTriangle size={40} />
           </div>
           <h3 className="text-xl font-black mb-2">Infraestrutura Necessária</h3>
           <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 font-medium">A tabela <code className="bg-black/10 dark:bg-black/40 px-2 py-1 rounded-md text-whatsapp-teal">faqs</code> não foi encontrada no seu banco de dados Supabase.</p>
           
           <div className="bg-black/5 dark:bg-black/30 p-6 rounded-3xl text-left font-mono text-[11px] mb-8 relative group">
              <div className="absolute top-4 right-4 text-[9px] font-black text-whatsapp-teal bg-whatsapp-teal/10 px-2 py-1 rounded">SCHEMA NECESSÁRIO</div>
              <pre className="text-gray-400">
                {`create table public.faqs (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  category text default 'Geral',
  is_active boolean default true,
  order_index int default 0,
  created_at timestamp with time zone default now()
);`}
              </pre>
           </div>

           <button 
             onClick={fetchFaqs}
             className="px-8 py-4 bg-whatsapp-teal text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-whatsapp-teal/20 hover:scale-105 active:scale-95 transition-all"
           >
             Tentar Novamente após Criar
           </button>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-whatsapp-darkLighter rounded-[40px] border border-dashed border-gray-200 dark:border-white/10 shadow-inner">
           <HelpCircle className="mx-auto w-16 h-16 text-gray-300 mb-6 opacity-20" />
           <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Nenhuma pergunta no Banco de Dados</p>
           <button 
             onClick={seedInitialFaqs}
             className="px-8 py-4 bg-whatsapp-teal/10 text-whatsapp-teal border border-whatsapp-teal/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-whatsapp-teal hover:text-white transition-all active:scale-95"
           >
             Popular com Perguntas Sugeridas
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredFaqs.map((faq, index) => (
            <div key={faq.id} className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] hover:border-whatsapp-teal/30 transition-all group">
               <div className="flex items-start gap-4">
                 <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={async () => {
                       if (index === 0) return;
                       const prev = filteredFaqs[index - 1];
                       await supabase.from('faqs').update({ order_index: prev.order_index }).eq('id', faq.id);
                       await supabase.from('faqs').update({ order_index: faq.order_index }).eq('id', prev.id);
                       fetchFaqs();
                     }}
                     className="p-1 hover:text-whatsapp-teal transition-colors"
                     disabled={index === 0}
                   >
                     <ChevronUp size={20} />
                   </button>
                   <button 
                     onClick={async () => {
                       if (index === filteredFaqs.length - 1) return;
                       const next = filteredFaqs[index + 1];
                       await supabase.from('faqs').update({ order_index: next.order_index }).eq('id', faq.id);
                       await supabase.from('faqs').update({ order_index: faq.order_index }).eq('id', next.id);
                       fetchFaqs();
                     }}
                     className="p-1 hover:text-whatsapp-teal transition-colors"
                     disabled={index === filteredFaqs.length - 1}
                   >
                     <ChevronDown size={20} />
                   </button>
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black text-whatsapp-teal dark:text-whatsapp-green uppercase tracking-widest">{faq.category}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => { setEditing(faq); setForm({ question: faq.question, answer: faq.answer, category: faq.category }); }}
                           className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:text-whatsapp-teal transition-all"
                         >
                           <Edit3 size={16} />
                         </button>
                         <button 
                           onClick={() => handleDelete(faq.id)}
                           className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:text-red-500 transition-all"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                   </div>
                   <h4 className="font-black dark:text-white text-lg mb-3 leading-tight">{faq.question}</h4>
                   <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6 italic">{faq.answer}</p>
                   
                   <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-white/5">
                      <button 
                         onClick={() => handleToggleActive(faq.id, faq.is_active)}
                         className="flex items-center gap-3 active:scale-95 transition-all"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          faq.is_active ? "bg-whatsapp-green text-whatsapp-dark" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                        )}>
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          {faq.is_active ? "Publicada" : "Inativa"}
                        </span>
                      </button>
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">
                        ID: {faq.id?.includes('-') ? faq.id.split('-')[0] : faq.id?.substring(0, 8)}
                      </span>
                   </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl rounded-[40px] border-white/5 bg-white dark:bg-whatsapp-darkLighter p-8">
           <DialogHeader className="mb-8">
             <DialogTitle className="text-2xl font-black flex items-center gap-3">
               <HelpCircle className="text-whatsapp-teal" />
               {editing?.id ? "Ajustar Conhecimento" : "Nova Pergunta de Fé"}
             </DialogTitle>
           </DialogHeader>

           <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Categoria de Suporte</label>
                 <select 
                   value={form.category}
                   onChange={e => setForm({...form, category: e.target.value})}
                   className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 ring-whatsapp-teal/30 appearance-none"
                 >
                    <option>Geral</option>
                    <option>Pagamentos</option>
                    <option>Segurança</option>
                    <option>Perfil</option>
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Pergunta do Usuário</label>
                 <input 
                   type="text"
                   value={form.question}
                   onChange={e => setForm({...form, question: e.target.value})}
                   required
                   placeholder="Ex: Como faço para doar dízimo?"
                   className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 ring-whatsapp-teal/30"
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Resposta Oficial</label>
                 <textarea 
                   value={form.answer}
                   onChange={e => setForm({...form, answer: e.target.value})}
                   required
                   rows={5}
                   placeholder="A resposta clara e objetiva para o fiel..."
                   className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 ring-whatsapp-teal/30 resize-none leading-relaxed"
                 />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                 <DialogClose asChild>
                    <button type="button" className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">Descartar</button>
                 </DialogClose>
                 <button 
                  type="submit"
                  disabled={saving}
                  className="px-10 py-4 bg-whatsapp-teal text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-whatsapp-teal/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                 >
                    <Save size={16} />
                    {saving ? "Registrando..." : "Sincronizar"}
                 </button>
              </div>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
