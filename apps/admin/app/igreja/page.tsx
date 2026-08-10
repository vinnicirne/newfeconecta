"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Users, Flame, Plus, Shield, Home } from "lucide-react";
import Link from "next/link";

export default function ChurchesPage() {
  const [churches, setChurches] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [userRoles, setUserRoles] = useState<any[]>([]);

  useEffect(() => {
    // ✅ Dispara as duas chamadas em paralelo — nenhuma depende da outra
    Promise.all([fetchChurches(), loadUserRoles()]);
  }, []);

  async function loadUserRoles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('church_members')
      .select('role, church:churches(slug, name)')
      .eq('user_id', user.id)
      .eq('approved', true);
    setUserRoles(data || []);
  }

  async function fetchChurches() {
    // ✅ Select específico — elimina payload desnecessário
    const { data } = await supabase
      .from('churches')
      .select('id, name, slug, banner_url, slogan, member_count');

    const churchesWithCount = (data || []).map(church => ({
      ...church,
      member_count: church.member_count || 0
    })).sort((a, b) => b.member_count - a.member_count);

    setChurches(churchesWithCount);
  }

  const filtered = churches.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] text-gray-900 dark:text-white pb-32 md:pb-10 transition-colors duration-300">

      {/* Menu Superior (Hub) */}
      <div className="bg-white dark:bg-[#111B21] border-b border-black/5 dark:border-white/5 pt-20 pb-6 px-4 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] to-[#00A884]">
                Encontre uma Casa
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Descubra comunidades ou gerencie a sua própria.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/igreja/criar" className="px-6 py-3 bg-[#25D366] text-black rounded-2xl font-bold flex items-center gap-2 hover:bg-[#00A884] transition-all text-sm shadow-lg shadow-[#25D366]/20">
                <Plus size={18} /> Registrar Igreja
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Busca e Lista */}
      <div className="max-w-4xl mx-auto px-4 mt-10">
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar igrejas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#111B21] border border-[#25D366]/30 rounded-2xl pl-12 py-4 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366]/60 transition-colors shadow-lg"
          />
        </div>

        {churches.length === 0 ? (
          <div className="text-center py-20 bg-black/5 dark:bg-[#111B21]/50 rounded-3xl border border-black/5 dark:border-white/5">
            <Users className="w-12 h-12 text-[#25D366]/40 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Nenhuma igreja encontrada na sua região ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((church) => (
              <Link href={`/igreja/${church.slug}`} key={church.id}>
                <div className="bg-white dark:bg-[#111B21] rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 border border-black/5 dark:border-white/5 shadow-xl group">
                  <div className="relative h-48 w-full bg-gray-200 dark:bg-zinc-800">
                    {church.banner_url ? (
                      <img src={church.banner_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#075E54] to-[#25D366] opacity-30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#111B21] via-transparent to-transparent" />
                  </div>

                  <div className="p-6 relative">
                    <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-1">{church.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-1">{church.slogan || "Uma comunidade FéConecta"}</p>

                    <div className="flex gap-4 mt-2 text-sm font-medium">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-full">
                        <Users className="w-4 h-4" /> {church.member_count || 0} irmãos
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-full">
                        <Flame className="w-4 h-4" /> Ativa
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
