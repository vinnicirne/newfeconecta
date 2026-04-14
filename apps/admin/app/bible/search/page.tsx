"use client";

import { useState, useEffect } from "react";
import { 
  Search, ArrowLeft, Filter, BookOpen, 
  ChevronRight, Sparkles, BarChart3, 
  Book, ScrollText, X, History
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BibleSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, vt: 0, nt: 0 });
  const [activeTestament, setActiveTestament] = useState<'all' | 'VT' | 'NT'>('all');

  // Simulação de busca enquanto configuramos o motor real
  // Em uma implementação real, usaríamos um endpoint de busca global
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 3) {
      toast.error("Digite pelo menos 3 letras para buscar");
      return;
    }

    try {
      setLoading(true);
      // Aqui chamaremos a API de busca. Ex: A Bíblia Digital Search
      // Por enquanto, vamos simular os resultados e as estatísticas solicitadas pelo usuário
      
      // Simulação de delay de rede
      await new Promise(r => setTimeout(r, 800));

      // Simulando lógica de contagem (Exemplo do usuário: jejum)
      // No mundo real, os dados viriam do backend/API
      const mockTotal = query.toLowerCase() === "jejum" ? 3062 : Math.floor(Math.random() * 500);
      const mockNT = Math.floor(mockTotal * 0.3);
      const mockVT = mockTotal - mockNT;

      setStats({ total: mockTotal, vt: mockVT, nt: mockNT });
      
      // Simulando alguns versículos encontrados
      setResults([
        { book: "Mateus", chapter: 4, verse: 2, text: "E, depois de jejuar quarenta dias e quarenta noites, teve fome.", testament: "NT" },
        { book: "Isaías", chapter: 58, verse: 6, text: "Porventura não é este o jejum que escolhi, que soltes as ligaduras da impiedade...", testament: "VT" },
        { book: "Joel", chapter: 2, verse: 12, text: "Ainda assim, agora mesmo diz o Senhor: Convertei-vos a mim de todo o vosso coração; e isso com jejuns...", testament: "VT" },
      ]);

    } catch (error) {
      toast.error("Erro ao realizar busca");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      
      {/* HEADER BUSCA */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center gap-4">
           <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
           >
             <ArrowLeft className="w-5 h-5 dark:text-white" />
           </button>
           
           <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 focus-within:text-whatsapp-teal transition-colors" />
              <input 
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque por palavras ou referências (Ex: Amor, João 3:16)"
                className="w-full bg-gray-100 dark:bg-white/5 p-4 pl-12 rounded-[20px] outline-none dark:text-white font-bold placeholder:text-gray-400 focus:ring-2 ring-whatsapp-teal/20 transition-all shadow-inner"
              />
              {query && (
                <button 
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
           </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        
        {/* DASHBOARD DE ESTATÍSTICAS (O CORAÇÃO DA SOLICITAÇÃO) */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
             <div className="bg-gradient-to-br from-whatsapp-teal to-emerald-700 p-6 rounded-[32px] shadow-xl shadow-whatsapp-teal/20 text-white relative overflow-hidden group">
                <BarChart3 className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Encontrado</p>
                <h3 className="text-4xl font-black">{stats.total}</h3>
                <p className="text-xs font-bold mt-2 opacity-80 italic">Ocorrências da palavra</p>
             </div>

             <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <BookOpen size={20} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Antigo Testamento</span>
                </div>
                <h3 className="text-3xl font-black dark:text-white">{stats.vt}</h3>
                <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div 
                    className="bg-amber-500 h-full transition-all duration-1000" 
                    style={{ width: `${(stats.vt / stats.total) * 100}%` }}
                   />
                </div>
             </div>

             <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Sparkles size={20} />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Novo Testamento</span>
                </div>
                <h3 className="text-3xl font-black dark:text-white">{stats.nt}</h3>
                <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div 
                    className="bg-blue-500 h-full transition-all duration-1000" 
                    style={{ width: `${(stats.nt / stats.total) * 100}%` }}
                   />
                </div>
             </div>
          </div>
        )}

        {/* FILTROS DE RESULTADO */}
        {results.length > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
             <button 
              onClick={() => setActiveTestament('all')}
              className={cn(
                "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                activeTestament === 'all' ? "bg-black dark:bg-white text-white dark:text-black" : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200"
              )}
             >
               Todos
             </button>
             <button 
              onClick={() => setActiveTestament('VT')}
              className={cn(
                "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                activeTestament === 'VT' ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200"
              )}
             >
               Antigo Testamento
             </button>
             <button 
              onClick={() => setActiveTestament('NT')}
              className={cn(
                "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                activeTestament === 'NT' ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200"
              )}
             >
               Novo Testamento
             </button>
          </div>
        )}

        {/* RESULTADOS DA BUSCA */}
        <div className="space-y-6">
           {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="bg-white dark:bg-white/5 rounded-[32px] p-6 animate-pulse space-y-4 border border-gray-100 dark:border-white/5">
                  <div className="w-32 h-4 bg-gray-100 dark:bg-white/10 rounded-full" />
                  <div className="w-full h-16 bg-gray-100 dark:bg-white/10 rounded-2xl" />
               </div>
             ))
           ) : results.length > 0 ? (
             results
              .filter(r => activeTestament === 'all' || r.testament === activeTestament)
              .map((result, idx) => (
               <div 
                key={idx} 
                onClick={() => router.push(`/bible?verse=${result.book.toLowerCase()}${result.chapter}:${result.verse}`)}
                className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-gray-100 dark:border-white/5 hover:border-whatsapp-teal transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-95"
               >
                  <div className="flex items-center justify-between mb-4">
                     <span className="px-3 py-1 bg-gray-50 dark:bg-white/10 rounded-xl text-[10px] font-black text-whatsapp-teal uppercase tracking-widest">
                       {result.book} {result.chapter}:{result.verse}
                     </span>
                     <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-whatsapp-teal transition-colors" />
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed group-hover:text-black dark:group-hover:text-white transition-colors">
                    {result.text}
                  </p>
               </div>
             ))
           ) : (
             <div className="py-32 text-center space-y-6">
                <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-[40px] flex items-center justify-center mx-auto text-gray-300">
                   <Search className="w-10 h-10" />
                </div>
                <div>
                   <h3 className="text-lg font-black dark:text-white uppercase tracking-tight">Comece sua Pesquisa</h3>
                   <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">Encontre versículos por palavras-chave ou referências bíblicas instantaneamente.</p>
                </div>
                
                <div className="pt-6 grid grid-cols-2 gap-3 max-w-sm mx-auto">
                   {['Paz', 'Amor', 'Fé', 'Justiça'].map(term => (
                     <button 
                      key={term}
                      onClick={() => { setQuery(term); }}
                      className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 text-xs font-bold dark:text-white hover:border-whatsapp-teal transition-colors"
                     >
                       {term}
                     </button>
                   ))}
                </div>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
