"use client";

import React, { useState } from "react";
import { X, Plus, Camera, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CreateHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: (highlight: any) => void;
}

export function CreateHighlightModal({ isOpen, onClose, userId, onSuccess }: CreateHighlightModalProps) {
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSave = async () => {
    if (!label || !file) {
      alert("Preencha o nome e selecione uma imagem");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload da Capa
      const fileName = `highlight_${userId}_${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path);

      // 2. Salvar no Banco
      const { data: highlight, error: dbError } = await supabase
        .from('highlights')
        .insert({
          user_id: userId,
          label,
          cover_url: publicUrl
        })
        .select()
        .single();

      if (dbError) throw dbError;

      onSuccess(highlight);
      onClose();
      // Reset
      setLabel("");
      setFile(null);
      setPreview(null);
    } catch (err: any) {
      alert("Erro ao criar destaque: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0f0f0f] border border-white/10 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-lg font-bold">Novo Destaque</h2>
          <div className="w-9" />
        </div>

        <div className="p-8 space-y-6 flex flex-col items-center">
          {/* Cover Selector */}
          <div className="relative group">
            <div className="w-[84px] h-[84px] rounded-full p-[2px] bg-white/10 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-gray-900 border border-black overflow-hidden flex items-center justify-center">
                   {preview ? (
                     <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                   ) : (
                     <Camera className="w-8 h-8 text-gray-600" />
                   )}
                </div>
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-whatsapp-green rounded-full border-4 border-black flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
               <Plus className="w-5 h-5 text-whatsapp-dark" />
               <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          </div>

          <div className="w-full space-y-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1">Nome do Destaque</label>
            <input 
              type="text"
              maxLength={15}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none text-center"
              placeholder="Ex: Viagens"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "Criando..." : <><Save className="w-4 h-4" /> Criar Destaque</>}
          </button>
        </div>
      </div>
    </div>
  );
}
