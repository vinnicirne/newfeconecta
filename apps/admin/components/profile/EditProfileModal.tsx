"use client";

import React, { useState } from "react";
import { X, Save, Instagram, Linkedin, Youtube, Globe, MessageCircle, Calendar, Shield, ShieldOff, User, Church, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EditProfileModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: any) => void;
}

export function EditProfileModal({ user, isOpen, onClose, onUpdate }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
    gender: "",
    birthdate: "",
    birthdate_public: false,
    church: "",
    avatar_url: "",
    banner_url: "",
    instagram_url: "",
    whatsapp_url: "",
    linkedin_url: "",
    youtube_url: "",
    website_url: "",
  });
 
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza os dados sempre que o modal abre ou o usuário muda
  React.useEffect(() => {
    if (isOpen && user) {
      setFormData({
        full_name: user.full_name || "",
        username: user.username || "",
        bio: user.bio || "",
        gender: user.gender || "",
        birthdate: user.birthdate || "",
        birthdate_public: user.birthdate_public ?? false,
        church: user.church || "",
        avatar_url: user.avatar_url || "",
        banner_url: user.banner_url || "",
        instagram_url: user.instagram_url || "",
        whatsapp_url: user.whatsapp_url || "",
        linkedin_url: user.linkedin_url || "",
        youtube_url: user.youtube_url || "",
        website_url: user.website_url || "",
      });
      setAvatarPreview(user.avatar_url || "");
      setBannerPreview(user.banner_url || "");
      setAvatarFile(null);
      setBannerFile(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error("Usuário não identificado");

      let currentAvatarUrl = formData.avatar_url;
      let currentBannerUrl = formData.banner_url;

      // 1. Upload de Avatar se houver novo arquivo
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}-avatar-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        currentAvatarUrl = publicUrl;
      }

      // 2. Upload de Banner se houver novo arquivo
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${userId}-banner-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars') // Usando o mesmo bucket de avatars para simplificar, mas em pasta diferente ou bucket banners se existir
          .upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        currentBannerUrl = publicUrl;
      }
      
      const updatePayload = {
        ...formData,
        avatar_url: currentAvatarUrl,
        banner_url: currentBannerUrl
      };

      // Limpa os dados
      const cleanedData = Object.fromEntries(
        Object.entries(updatePayload).map(([key, value]) => [
          key, 
          value === "" ? null : value
        ])
      );
      
      const { error } = await supabase
        .from('profiles')
        .update(cleanedData)
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Perfil atualizado com sucesso!");
      onUpdate({ ...user, ...updatePayload });
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar perfil: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') {
          setAvatarFile(file);
          setAvatarPreview(reader.result as string);
        } else {
          setBannerFile(file);
          setBannerPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0f0f0f] border border-white/10 w-full max-w-xl max-h-[90vh] overflow-hidden rounded-[32px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Editar Perfil</h2>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-whatsapp-green text-whatsapp-dark px-5 py-2 rounded-xl text-sm font-black hover:bg-whatsapp-greenLight transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? "Salvando..." : <><Save className="w-4 h-4" /> Salvar</>}
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          {/* Identidade Visual */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Identidade Visual</h3>
            
            <div className="relative">
              {/* Banner Selector */}
              <div className="relative h-32 sm:h-40 bg-white/5 rounded-3xl border border-white/10 overflow-hidden group">
                {bannerPreview ? (
                  <img src={bannerPreview} className="w-full h-full object-cover" alt="Banner" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Globe className="w-8 h-8 opacity-20" />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'banner')} className="hidden" />
                </label>
              </div>

              {/* Avatar Selector */}
              <div className="absolute -bottom-6 left-6 group">
                <div className="relative w-24 h-24 rounded-[32px] bg-[#0f0f0f] p-1.5 shadow-2xl">
                  <div className="w-full h-full rounded-[26px] bg-white/5 border border-white/10 overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/40 rounded-[26px] left-1.5 top-1.5 right-1.5 bottom-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'avatar')} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
            <div className="pt-8 px-1">
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dica: Use fotos nítidas para o seu banner.</p>
            </div>
          </section>

          {/* Informações Básicas */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Informações de Conta</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none"
                    placeholder="Seu nome"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Nome de Usuário (Único)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                  <input 
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none"
                    placeholder="usuario"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 ml-1">Sobre Você (Bio)</label>
              <textarea 
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none resize-none"
                placeholder="Conte um pouco sobre sua caminhada com a fé..."
              />
            </div>
          </section>

          {/* Dados Pessoais */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Dados Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">Igreja</label>
                <div className="relative">
                  <Church className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    value={formData.church}
                    onChange={(e) => setFormData({...formData, church: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none"
                    placeholder="Sua igreja atual"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 ml-1 uppercase tracking-wider">Gênero</label>
              <select 
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none appearance-none cursor-pointer [color-scheme:dark] transition-all hover:bg-white/10"
              >
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
                <option value="prefer_not_to_say">Prefiro não dizer</option>
              </select>
            </div>
            </div>

            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Data de Nascimento
                </span>
                <input 
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                  className="bg-transparent text-sm text-gray-300 outline-none mt-1"
                />
              </div>
              <button 
                onClick={() => setFormData({...formData, birthdate_public: !formData.birthdate_public})}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
                  formData.birthdate_public ? "bg-whatsapp-green/20 text-whatsapp-green" : "bg-red-500/10 text-red-500"
                )}
              >
                {formData.birthdate_public ? <><Shield className="w-3.5 h-3.5" /> Público</> : <><ShieldOff className="w-3.5 h-3.5" /> Privado</>}
              </button>
            </div>
          </section>

          {/* Links e Redes Sociais */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Conectar Redes Sociais</h3>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { name: 'Instagram', icon: Instagram, key: 'instagram_url' },
                { name: 'WhatsApp', icon: MessageCircle, key: 'whatsapp_url' },
                { name: 'LinkedIn', icon: Linkedin, key: 'linkedin_url' },
                { name: 'YouTube', icon: Youtube, key: 'youtube_url' },
                { name: 'Site / Blog', icon: Globe, key: 'website_url' },
              ].map((link) => (
                <div key={link.key} className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <link.icon className="w-4 h-4 text-gray-500 group-focus-within:text-whatsapp-green transition-colors" />
                  </div>
                  <input 
                    type="text"
                    value={(formData as any)[link.key]}
                    onChange={(e) => setFormData({...formData, [link.key]: e.target.value})}
                    placeholder={`Link do ${link.name}`}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
