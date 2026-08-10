"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Calendar, Edit3, Trash2, Plus, BookOpen, Flame,
  Heart, MessageSquare, Repeat2, Send, X, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight, ShieldCheck, Save
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";
import { cn } from "@/lib/utils";

moment.locale("pt-br");

export default function WeeklyVersesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paginação por blocos de 7
  const [pageIndex, setPageIndex] = useState(0); 

  // Modais de admin
  const [showEditor, setShowEditor] = useState(false);
  const [editingVerse, setEditingVerse] = useState<any>(null);
  const [forceAdmin, setForceAdmin] = useState(false); // Apenas para testes do dev
  
  // Campos do formulário
  const [formData, setFormData] = useState({
    content: "",
    reference: "",
    background_url: "",
    is_active: true
  });

  useEffect(() => {
    fetchInitialData();
  }, [pageIndex]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser(profile);
      }
      
      const from = pageIndex * 7;
      const to = from + 6;

      const { data, error } = await supabase
        .from('daily_verses')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setVerses(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar os versículos");
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.is_admin === true || forceAdmin;

  // Salvar versa
  async function handleSave() {
    if (!formData.content || !formData.reference) {
       toast.error("Preencha o conteúdo e a referência bíblica!");
       return;
    }
    
    try {
       if (editingVerse) {
          const { error } = await supabase.from('daily_verses').update(formData).eq('id', editingVerse.id);
          if (error) throw error;
          toast.success("Palavra atualizada com sucesso!");
       } else {
          const { error } = await supabase.from('daily_verses').insert(formData);
          if (error) throw error;
          toast.success("Nova Palavra do Dia publicada para a comunidade!");
       }
       setShowEditor(false);
       fetchInitialData();
    } catch (err) {
       console.error("Erro ao salvar Daily Verse", err);
       toast.error("Restrição de FK ou estrutura: Verifique as dependências do BD para 'daily_verses'");
    }
  }

  // Deletar
  async function handleDelete(id: string) {
    if (!confirm("Aviso: Essa ação é irreversível. Tem certeza que deseja apagar essa Palavra?")) return;
    try {
      const { error } = await supabase.from('daily_verses').delete().eq('id', id);
      if (error) throw error;
      toast.success("Versículo deletado e removido do feed.");
      fetchInitialData();
    } catch (err) {
      toast.error("Falha ao deletar. Ele já pode estar referenciado por comentários.");
    }
  }

  function openEditor(verse: any = null) {
     if (!isAdmin) return;
     if (verse) {
        setEditingVerse(verse);
        setFormData({
           content: verse.content,
           reference: verse.reference,
           background_url: verse.background_url || "",
           is_active: verse.is_active
        });
     } else {
        setEditingVerse(null);
        setFormData({ content: "", reference: "", background_url: "", is_active: true });
     }
     setShowEditor(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] pb-32">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5 dark:text-white" />
              </button>
              <h1 className="text-lg font-black dark:text-white tracking-tight">O Setenário</h1>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setForceAdmin(!forceAdmin)} 
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isAdmin ? "bg-whatsapp-teal/10 text-whatsapp-teal" : "text-gray-300"
                )}
                title="Alternar Modo Admin"
              >
                <ShieldCheck size={20} />
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
         <div className="mb-10 text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-whatsapp-green/10 rounded-full text-whatsapp-green">
               <Calendar className="w-4 h-4" />
               <span className="text-xs font-black uppercase tracking-widest">Histórico Diário</span>
            </div>
            <h2 className="text-3xl font-black dark:text-white leading-none">
               As Sete Palavras <br/> <span className="text-whatsapp-teal">da Semana</span>
            </h2>
            <p className="text-gray-500 text-sm font-medium">Revisite os encontros com Deus dos últimos 7 dias. Ao longo de cada semana o ciclo se renova.</p>
         </div>

         {/* LIST VIEW */}
         <div className="space-y-8">
            {loading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="w-full h-80 bg-white dark:bg-[#111] rounded-[32px] animate-pulse" />
               ))
            ) : verses.length > 0 ? (
               verses.map((verse, index) => {
                  const date = moment(verse.created_at);
                  const isToday = index === 0 && pageIndex === 0;

                  return (
                    <div key={verse.id} className="relative group">
                       {/* Linha do tempo visual */}
                       {index !== verses.length - 1 && (
                         <div className="absolute left-6 top-20 bottom-[-40px] w-0.5 bg-gray-200 dark:bg-white/10 z-0" />
                       )}

                       <div className="flex flex-col gap-3 relative z-10">
                          {/* Cabeçalho da Data */}
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-black",
                               isToday ? "bg-whatsapp-teal text-white border-whatsapp-teal shadow-lg shadow-whatsapp-teal/30" : "bg-white dark:bg-[#111] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/10"
                             )}>
                               <span className="text-xs mt-1 leading-none">{date.format("DD")}</span>
                               <span className="text-[8px] uppercase tracking-tighter opacity-80 leading-none mb-1">{date.format("MMM")}</span>
                             </div>
                             <div>
                               <p className="font-bold text-gray-800 dark:text-white capitalize">{date.format("dddd")}</p>
                               <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                 {isToday ? "Palavra de Hoje" : "Palavra Anterior"}
                               </p>
                             </div>
                          </div>

                          {/* O Card do Versículo */}
                          <div className={cn(
                             "relative overflow-hidden rounded-[32px] shadow-sm transition-all flex flex-col min-h-[300px]",
                             !verse.is_active && "opacity-50 grayscale hover:grayscale-0",
                             isToday ? "ring-2 ring-whatsapp-teal/30 ring-offset-4 dark:ring-offset-[#0A0A0A]" : "border border-gray-100 dark:border-white/5"
                          )}>
                             {/* Background */}
                             {verse.background_url ? (
                               <img src={verse.background_url} className="absolute inset-0 w-full h-full object-cover dark:opacity-80" alt="" />
                             ) : (
                               <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 to-purple-800" />
                             )}
                             <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

                             {/* Conteúdo */}
                             <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                                <h3 className="text-2xl font-black text-white px-4 leading-tight font-serif drop-shadow-md">"{verse.content}"</h3>
                                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full">
                                  <BookOpen className="w-3 h-3 text-white" />
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest">{verse.reference}</span>
                                </div>
                             </div>

                             {/* Barra de Engajamento Glassmorphism */}
                             <div className="relative z-10 bg-black/30 backdrop-blur-md border-t border-white/10 p-4">
                                <div className="flex items-center justify-between max-w-[80%] mx-auto">
                                   <div className="flex flex-col items-center gap-1">
                                      <Heart className="w-5 h-5 text-white/80" />
                                      <span className="text-[9px] font-black tracking-widest text-white/50">{verse.likes_count || 0}</span>
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <MessageSquare className="w-5 h-5 text-white/80" />
                                      <span className="text-[9px] font-black tracking-widest text-white/50">{verse.comments_count || 0}</span>
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <Repeat2 className="w-5 h-5 text-white/80" />
                                      <span className="text-[9px] font-black tracking-widest text-white/50">{verse.reposts_count || 0}</span>
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                      <Send className="w-5 h-5 text-white/80" />
                                      <span className="text-[9px] font-black tracking-widest text-white/50">{verse.shares_count || 0}</span>
                                   </div>
                                </div>
                             </div>

                             {/* Admin Panel flutuante */}
                             {isAdmin && (
                               <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditor(verse)} className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(verse.id)} className="w-10 h-10 rounded-2xl bg-red-500/20 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-red-100 hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  );
               })
            ) : (
               <div className="py-20 text-center opacity-50">
                  <span className="text-6xl mb-4 block">🏜️</span>
                  <p className="font-black uppercase tracking-widest text-sm dark:text-white">Nenhuma Palavra na Memória</p>
               </div>
            )}
         </div>

         {/* CONTROLE DE PAGINAÇÃO (7 DIAS) */}
         {verses.length > 0 && (
           <div className="mt-16 flex items-center justify-between px-2">
              <button 
                disabled={verses.length < 7 && pageIndex > 0}
                onClick={() => setPageIndex(p => p + 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-[#111] font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-xl transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" /> Semana Anterior
              </button>

              <span className="text-[10px] font-bold text-gray-400">Pág {pageIndex + 1}</span>

              <button 
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-[#111] font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-xl transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                Próxima Semana <ChevronRight className="w-4 h-4" />
              </button>
           </div>
         )}
      </div>

      {/* FAB MODERADOR: NOVA PALAVRA */}
      {isAdmin && (
         <button 
           onClick={() => openEditor()}
           className="fixed bottom-24 right-6 p-5 bg-gradient-to-br from-whatsapp-teal to-emerald-700 text-white rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all z-50 group flex items-center justify-center"
         >
           <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
         </button>
      )}

      {/* MODAL EDITOR ADMIN */}
      {showEditor && (
        <div className="fixed inset-0 z-[200] flex justify-center items-end md:items-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-[#111] w-full max-w-lg md:rounded-[40px] rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                 <div>
                    <h3 className="font-black text-whatsapp-teal uppercase tracking-widest text-[11px]">Centro de Moderação</h3>
                    <p className="text-xl font-black dark:text-white">{editingVerse ? "Editar Palavra" : "Implantar Nova Palavra"}</p>
                 </div>
                 <button onClick={() => setShowEditor(false)} className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                   <X className="w-4 h-4 text-gray-400" />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">Conteúdo Profético</label>
                   <textarea 
                     value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                     className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-white/5 rounded-2xl p-4 text-sm font-medium dark:text-white outline-none focus:border-whatsapp-teal transition-colors resize-none min-h-[120px]"
                     placeholder='Ex: "Neste mundo tereis aflições..."'
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">Referência</label>
                      <input 
                        value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-white/5 rounded-2xl p-4 text-sm font-bold dark:text-white outline-none focus:border-whatsapp-teal transition-colors"
                        placeholder="João 16:33"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block flex items-center justify-between">Estado
                        <div className="w-2 h-2 rounded-full bg-whatsapp-green animate-pulse" />
                      </label>
                      <button 
                        onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                        className={cn(
                          "w-full rounded-2xl p-4 text-sm font-black uppercase tracking-widest transition-colors h-[54px] border border-transparent",
                          formData.is_active ? "bg-whatsapp-green/10 text-whatsapp-green border-whatsapp-green/20" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                        )}
                      >
                        {formData.is_active ? "Ativo no Feed" : "Arquivado"}
                      </button>
                    </div>
                 </div>

                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">Capa de Fundo (URL Imagem)</label>
                   <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        value={formData.background_url} onChange={e => setFormData({...formData, background_url: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-black border border-gray-100 dark:border-white/5 rounded-2xl p-4 pl-12 text-sm font-medium dark:text-white outline-none focus:border-whatsapp-teal transition-colors"
                        placeholder="https://images.unsplash.com/..."
                      />
                   </div>
                 </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 shrink-0 flex gap-3">
                 <button onClick={() => setShowEditor(false)} className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-gray-100 dark:bg-white/5 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                 <button onClick={handleSave} className="flex-1 bg-whatsapp-teal text-white rounded-2xl font-black text-[13px] uppercase tracking-widest flex items-center justify-center shadow-lg shadow-whatsapp-teal/30 hover:scale-[1.02] active:scale-95 transition-all">
                   <Save size={18} className="mr-2" /> Salvar Definitivo
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
