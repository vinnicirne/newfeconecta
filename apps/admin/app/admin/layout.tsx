"use client";

import React from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Search, Bell, User, Rss, UserSquare2, BookOpen, ScrollText, Sparkles, FileText, HelpCircle } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-whatsapp-light dark:bg-whatsapp-dark">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-whatsapp-darkLighter px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-1 overflow-visible">
            <div className="relative w-full max-w-[160px] xl:max-w-[200px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar..."
                className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-full pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-whatsapp-green transition-all"
              />
            </div>

            {/* Links Rápidos (Abas Sobrepostas) */}
            <nav className="hidden lg:flex items-center pl-4 pt-1">
              {[
                { name: 'Notas', href: '/notes', icon: BookOpen },
                { name: 'Bíblia', href: '/bible', icon: ScrollText },
                { name: 'Versículo', href: '/admin/mensagem-do-dia', icon: Sparkles },
                { name: 'Páginas', href: '/admin/pages', icon: FileText },
                { name: 'FAQ', href: '/admin/faq', icon: HelpCircle },
              ].map((link, index) => (
                <Link
                  key={link.name}
                  href={link.href}
                  style={{ zIndex: 10 - index }}
                  className="relative flex items-center gap-1.5 px-4 py-2 -ml-3 first:ml-0 bg-gray-100 dark:bg-white/5 border-2 border-white dark:border-whatsapp-darkLighter rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-gray-500 hover:text-whatsapp-teal hover:bg-white dark:hover:bg-white/10 hover:-translate-y-0.5 hover:z-20 transition-all shadow-sm"
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Feed Social + Meu Perfil — atalhos rápidos */}
            <div className="flex items-center gap-1 border-r border-gray-200 dark:border-white/10 pr-4 mr-0">
              <Link href="/" title="Feed Social" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-whatsapp-teal transition-colors">
                <Rss className="w-5 h-5" />
              </Link>
              <Link href="/profile" title="Meu Perfil" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-whatsapp-teal transition-colors">
                <UserSquare2 className="w-5 h-5" />
              </Link>
            </div>
            <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-whatsapp-green rounded-full border-2 border-white dark:border-whatsapp-darkLighter" />
            </button>
            <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2" />
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold dark:text-white">Admin FéConecta</p>
                <p className="text-[11px] text-gray-500">Superusuário</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-whatsapp-teal flex items-center justify-center border-2 border-whatsapp-green/20">
                <User className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
