"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Plus, Search, MoreHorizontal, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import moment from "moment";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Gestão de Usuários" 
        description="Administre contas, aplique moderação e monitore crescimentos."
      >
        <button className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </PageHeader>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-whatsapp-darkLighter p-4 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-whatsapp-green" />
          <input 
            type="text" 
            placeholder="Pesquise por nome, email ou ID..."
            className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-whatsapp-green/20"
          />
        </div>
        <div className="flex items-center gap-2">
           <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-bold dark:text-white">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Atualizar
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Carregando rebanho digital...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-whatsapp-teal/10 flex items-center justify-center overflow-hidden border border-whatsapp-green/20">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                             <span className="text-whatsapp-teal font-black uppercase text-xs">{(u.full_name || 'U').charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">{u.full_name || 'Usuário FéConecta'}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{u.email || 'n/a'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-whatsapp-teal dark:text-whatsapp-green uppercase tracking-wider">@{u.username || 'n/a'}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold">
                      {moment(u.created_at).format('DD MMM YYYY')}
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {users.length === 0 && !loading && (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400 text-xs font-bold">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
