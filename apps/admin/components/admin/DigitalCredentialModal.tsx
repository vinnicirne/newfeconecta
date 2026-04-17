"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ShieldCheck, Award, Calendar, QrCode, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerificationBadge } from "@/components/verification-badge";
import moment from "moment";

interface DigitalCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    full_name: string;
    username: string;
    avatar_url?: string;
    verification_label?: string;
    created_at?: string;
  };
}

export function DigitalCredentialModal({ isOpen, onClose, user }: DigitalCredentialModalProps) {
  if (!user) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md animate-in fade-in duration-300" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1201] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 outline-none animate-in zoom-in duration-500">
          
          {/* Card Container */}
          <div className="relative aspect-[2/3] w-full bg-[#111] rounded-[40px] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-whatsapp-teal/20 to-transparent pointer-events-none" />

            {/* Header / Seal */}
            <div className="pt-10 pb-6 flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-whatsapp-teal blur-2xl opacity-20 animate-pulse" />
                <ShieldCheck className="w-16 h-16 text-whatsapp-teal relative z-10" />
              </div>
              <h2 className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-whatsapp-teal">Credencial Digital</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">FéConecta Authentic Profile</p>
            </div>

            {/* Profile Section */}
            <div className="flex-1 flex flex-col items-center px-8">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-[32px] border-4 border-[#222] overflow-hidden bg-[#222] shadow-2xl relative z-10">
                  <img 
                    src={user.avatar_url || "https://github.com/shadcn.png"} 
                    className="w-full h-full object-cover" 
                    alt={user.full_name} 
                  />
                </div>
                {/* Decorative frames */}
                <div className="absolute -inset-2 border border-whatsapp-teal/30 rounded-[40px] opacity-50" />
                <div className="absolute -inset-4 border border-whatsapp-teal/10 rounded-[48px] opacity-30" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-white tracking-tight">{user.full_name}</h3>
                <p className="text-sm font-black text-whatsapp-teal uppercase tracking-tighter">@{user.username}</p>
              </div>

              {/* Role Badge Big */}
              <div className="mt-8 w-full">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-whatsapp-teal/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  <VerificationBadge 
                    role={user.verification_label} 
                    size="lg" 
                    showLabel={true} 
                    className="scale-125"
                  />
                  
                  <div className="flex items-center gap-6 mt-2 relative z-10 w-full justify-center">
                    <div className="flex flex-col items-center">
                      <Award className="w-4 h-4 text-whatsapp-green mb-1" />
                      <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Status</span>
                      <span className="text-[10px] font-bold text-white uppercase">Ativo</span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col items-center">
                      <Calendar className="w-4 h-4 text-blue-400 mb-1" />
                      <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Desde</span>
                      <span className="text-[10px] font-bold text-white uppercase">{user.created_at ? moment(user.created_at).format('MMM YYYY') : '---'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer QR */}
            <div className="p-8 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                   <CheckCircle2 className="w-3 h-3 text-whatsapp-green" />
                   <span className="text-[9px] font-black uppercase text-white tracking-widest">ID Verificado</span>
                </div>
                <p className="text-[8px] text-gray-500 font-bold uppercase">Hash: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl p-1 opacity-80 hover:opacity-100 transition-opacity">
                <QrCode className="w-full h-full text-black" />
              </div>
            </div>

            {/* Close Trigger */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-center mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            FéConecta Digital Security • 2026
          </p>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
