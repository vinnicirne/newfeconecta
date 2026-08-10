"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Shield, BookOpen } from "lucide-react";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Dashboard', path: `/igreja/${params.slug}/admin`, icon: <LayoutDashboard size={18} /> },
    { name: 'Membros', path: `/igreja/${params.slug}/admin/membros`, icon: <Users size={18} /> },
    { name: 'Ministérios', path: `/igreja/${params.slug}/admin/grupos`, icon: <Shield size={18} /> },
    { name: 'Discipulados', path: `/igreja/${params.slug}/admin/discipulado`, icon: <BookOpen size={18} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      
      {/* Sub-menu do Admin */}
      <div className="mb-8 flex justify-center">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 w-fit">
          {tabs.map((tab) => {
          const isActive = tab.path === `/igreja/${params.slug}/admin` 
            ? pathname === tab.path 
            : pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={cn(
                "px-5 py-2.5 rounded-full font-bold flex items-center justify-center sm:justify-start gap-2 transition-all text-sm border",
                isActive 
                  ? "bg-[#25D366] text-black border-transparent shadow-[0_0_15px_rgba(37,211,102,0.3)]" 
                  : "bg-[#111B21] text-gray-400 border-white/10 hover:text-white hover:border-white/30"
              )}
            >
              {tab.icon} {tab.name}
            </Link>
          );
        })}
        </div>
      </div>

      {children}
    </div>
  );
}
