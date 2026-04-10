"use client";

import React from "react";
import { Sidebar } from "@/components/sidebar";
import { Search, Bell, User } from "lucide-react";

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
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar usuários, posts ou relatórios..."
              className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-whatsapp-green transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4">
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
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
