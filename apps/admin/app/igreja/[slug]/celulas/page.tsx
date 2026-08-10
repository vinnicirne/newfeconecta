"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { Search, Users, Plus, MapPin, Calendar, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CellsHub() {
  const { slug } = useParams();
  const router = useRouter();
  
  const [church, setChurch] = useState<any>(null);
  const [cells, setCells] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [slug]);

  async function loadData() {
    setIsLoading(true);
    try {
      // 1. Get Church
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();
        
      if (churchError || !churchData) {
        toast.error("Igreja não encontrada");
        return;
      }
      setChurch(churchData);

      // 2. Get User Role in Church
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('church_members')
          .select('role')
          .eq('church_id', churchData.id)
          .eq('user_id', user.id)
          .eq('approved', true)
          .maybeSingle();
          
        if (memberData) setUserRole(memberData.role);
      }

      // 3. Get Cells
      const { data: cellsData } = await supabase
        .from('church_cells')
        .select('*, leader:leader_id(raw_user_meta_data)')
        .eq('church_id', churchData.id)
        .order('created_at', { ascending: false });
        
      setCells(cellsData || []);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = cells.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center">Carregando...</div>;
  if (!church) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] text-gray-900 dark:text-white pb-24 transition-colors">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#111B21] border-b border-black/5 dark:border-white/5 pt-16 pb-6 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                Células & Pequenos Grupos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">{church.name}</p>
            </div>

            {(userRole === 'admin' || userRole === 'pastor') && (
              <button 
                onClick={() => toast.info("Em breve: Criação de células na versão beta")}
                className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-5 h-5" /> Nova Célula
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Busca e Lista */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#111B21] border border-black/5 dark:border-white/10 rounded-2xl pl-12 py-3.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 transition-colors shadow-sm"
          />
        </div>

        {cells.length === 0 ? (
          <div className="text-center py-20 bg-black/5 dark:bg-[#111B21]/50 rounded-3xl border border-black/5 dark:border-white/5">
            <Users className="w-12 h-12 text-indigo-500/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhuma célula encontrada</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Esta igreja ainda não cadastrou seus pequenos grupos.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((cell) => (
              <Link href={`/igreja/${church.slug}/celula/${cell.id}`} key={cell.id}>
                <div className="bg-white dark:bg-[#111B21] rounded-2xl p-5 hover:scale-[1.01] transition-transform duration-300 border border-black/5 dark:border-white/5 shadow-sm group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1 group-hover:text-indigo-500 transition-colors">{cell.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{cell.description || "Um lugar de comunhão e crescimento."}</p>
                      
                      <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {cell.meeting_day && cell.meeting_time && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-lg">
                            <Calendar className="w-3.5 h-3.5" /> {cell.meeting_day} às {cell.meeting_time}
                          </div>
                        )}
                        {cell.address && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-lg">
                            <MapPin className="w-3.5 h-3.5" /> {cell.address}
                          </div>
                        )}
                      </div>
                    </div>

                    {cell.leader && (
                      <div className="flex flex-col items-center flex-shrink-0 ml-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold uppercase overflow-hidden">
                          {cell.leader.raw_user_meta_data?.full_name ? cell.leader.raw_user_meta_data.full_name[0] : 'L'}
                        </div>
                        <span className="text-[9px] mt-1 text-gray-400 uppercase font-bold tracking-wider">Líder</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            
            {filtered.length === 0 && cells.length > 0 && (
              <div className="text-center py-10 text-gray-500">Nenhum resultado para a busca.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
