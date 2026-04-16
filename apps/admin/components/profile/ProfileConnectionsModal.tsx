"use client";

import React from "react";
import Link from "next/link";
import { X, UserSquare2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  data: any[];
}

export function ProfileConnectionsModal({
  isOpen,
  onClose,
  type,
  data
}: ProfileConnectionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-whatsapp-darkLighter rounded-[32px] overflow-hidden border border-gray-100 dark:border-white/5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-black uppercase tracking-widest text-xs dark:text-gray-400">
            {type === 'followers' ? 'Seguidores' : 'Seguindo'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto no-scrollbar p-2">
          {data.length > 0 ? (
            data.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10">
                    <img src={person.avatar_url || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm dark:text-white line-clamp-1">{person.full_name || person.username}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium">@{person.username}</span>
                      {person.is_common && (
                        <span className="text-[9px] bg-whatsapp-green/10 text-whatsapp-green px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">Em comum</span>
                      )}
                    </div>
                  </div>
                </div>
                <Link 
                  href={`/profile/${person.username}`} 
                  className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-whatsapp-green hover:text-whatsapp-dark rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  onClick={onClose}
                >
                  Ver
                </Link>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-3 opacity-40">
              <UserSquare2 className="w-8 h-8" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum perfil aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
