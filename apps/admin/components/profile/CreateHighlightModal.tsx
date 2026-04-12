"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Camera, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CreateHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: (highlight: any) => void;
  initialData?: any;
}

export function CreateHighlightModal({ isOpen, onClose, userId, onSuccess, initialData }: CreateHighlightModalProps) {
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Sincroniza o estado quando o initialData muda (Crucial para Edição)
  useEffect(() => {
    if (isOpen) {
      setLabel(initialData?.highlight_title || "");
      setPreview(initialData?.highlight_cover_url || initialData?.media_url || null);
      setFile(null); // Limpa o arquivo anterior
      if (typeof window !== "undefined") {
        (window as any).editingHighlightId = initialData?.id || null;
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSave = async () => {
    if (!label || !file && !preview) {
      alert("Preencha o nome e selecione uma imagem");
      return;
    }

    setIsSaving(true);
    try {
      let publicUrl = preview;

      // 1. Upload da Capa se houver novo arquivo
      if (file) {
        const fileName = `highlight_cover_${userId}_${Date.now()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: newUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path);
        
        publicUrl = newUrl;
      }

      // 2. Salvar na tabela de STORIES (Unificada)
      const storyData = {
        author_id: userId,
        highlight_title: label,
        highlight_cover_url: publicUrl,
        is_highlight: true,
        media_type: 'image',
        media_url: publicUrl, // Mantém compatibilidade
      };

      const { data: highlight, error: dbError } = await supabase
        .from('stories')
        .upsert({
          ...(userId && { author_id: userId }), // Apenas para segurança
          ...storyData,
          id: (window as any).editingHighlightId // Se estiver editando
        })
        .select()
        .single();

      if (dbError) throw dbError;

      onSuccess(highlight);
      onClose();
    } catch (err: any) {
      alert("Erro ao salvar destaque: " + err.message);
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
          <h2 className="text-lg font-bold">{initialData ? "Editar Destaque" : "Novo Destaque"}</h2>
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
            {isSaving ? "Salvando..." : <><Save className="w-4 h-4" /> {initialData ? "Salvar Alterações" : "Criar Destaque"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
