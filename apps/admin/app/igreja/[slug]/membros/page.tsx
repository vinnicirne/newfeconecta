"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, Shield } from "lucide-react";

export default function PublicMembersPage({ params }: { params: { slug: string } }) {
  const [church, setChurch] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMembers();
  }, [params.slug]);

  async function loadMembers() {
    const { data: churchData } = await supabase
      .from('churches')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (churchData) {
      setChurch(churchData);
      const { data: membersData } = await supabase
        .from('church_members')
        .select('role, user:profiles(id, full_name, avatar_url, username)')
        .eq('church_id', churchData.id)
        .eq('approved', true);

      setMembers(membersData || []);
    }
    setLoading(false);
  }

  const filtered = members.filter(m => 
    m.user?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    m.user?.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando membros...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pt-24 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
          <Users className="text-[#25D366]" /> Membros da Casa
        </h1>
        <p className="text-gray-400 mb-8">{church?.name}</p>

        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111B21] border border-white/5 rounded-2xl pl-12 py-4 text-white focus:outline-none focus:border-[#25D366]/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((member, i) => (
            <div key={i} className="bg-[#111B21] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-colors">
              <img src={member.user?.avatar_url || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate text-sm">{member.user?.full_name}</p>
                <p className="text-xs text-gray-400 truncate">@{member.user?.username}</p>
              </div>
              {['admin', 'pastor'].includes(member.role) && (
                <Shield className="w-4 h-4 text-[#25D366]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
