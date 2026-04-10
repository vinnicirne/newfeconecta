"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { Plus, Search, Filter, MoreHorizontal, Ban, ShieldCheck, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UsersPage() {
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
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-bold dark:text-white">
            <Filter className="w-3 h-3" /> Filtros
          </button>
          <select className="bg-gray-100 dark:bg-white/5 border-none rounded-xl text-xs font-bold px-4 py-2 dark:text-white focus:ring-2 focus:ring-whatsapp-green/20">
            <option>Todos os Status</option>
            <option>Ativos</option>
            <option>Banidos</option>
            <option>Shadow Ban</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {[
                { name: "João Silva", email: "joao@feconecta.com", role: "admin", status: "active", date: "01 Abr 2026" },
                { name: "Maria Santos", email: "maria@gmail.com", role: "user", status: "shadowban", date: "05 Abr 2026" },
                { name: "Ricardo Oliveira", email: "ric@outlook.com", role: "moderator", status: "active", date: "02 Abr 2026" },
                { name: "Ana Beatriz", email: "ana.b@fe.com", role: "user", status: "banned", date: "09 Abr 2026" },
              ].map((user, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal font-bold uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                      user.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                      user.role === 'moderator' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "flex items-center gap-1.5 text-xs font-medium",
                      user.status === 'active' ? "text-whatsapp-green" : 
                      user.status === 'shadowban' ? "text-orange-500" : "text-red-500"
                    )}>
                      {user.status === 'active' && <ShieldCheck className="w-3 h-3" />}
                      {user.status === 'shadowban' && <Ghost className="w-3 h-3" />}
                      {user.status === 'banned' && <Ban className="w-3 h-3" />}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {user.date}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
