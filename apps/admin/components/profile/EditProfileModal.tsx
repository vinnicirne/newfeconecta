"use client";

import React, { useState } from "react";
import { X, Save, Instagram, Linkedin, Youtube, Globe, MessageCircle, Calendar, Shield, ShieldOff, User, Church, Camera, Sun, Moon, Monitor, Lock, Users, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { setStoredProfile } from "@/lib/profile-cache";

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
    country: "",
    state: "",
    city: "",
    visibility_type: "public",
    notify_likes: true,
    notify_comments: true,
    notify_follows: true,
    notify_reposts: true,
    notify_mentions: true,
    notify_hashtags: true,
    show_counters: true,
    // FéNamoro
    is_premium: false,
    testimony_video_url: ""
  });
 
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const { uploadMedia, isUploading } = useMediaUpload();

  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.role === 'superadmin' ||
    user?.email === 'viniciuscirne@gmail.com' ||
    user?.email === 'agenciaiconedigital@gmail.com'
  );

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
        country: user.country || "",
        state: user.state || "",
        city: user.city || "",
        visibility_type: user.visibility_type || "public",
        notify_likes: user.notify_likes ?? true,
        notify_comments: user.notify_comments ?? true,
        notify_follows: user.notify_follows ?? true,
        notify_reposts: user.notify_reposts ?? true,
        notify_mentions: user.notify_mentions ?? true,
        notify_hashtags: user.notify_hashtags ?? true,
        show_counters: user.show_counters ?? true,
        is_premium: false,
        testimony_video_url: ""
      });
      setAvatarPreview(user.avatar_url || "");
      setBannerPreview(user.banner_url || "");
      setAvatarFile(null);
      setBannerFile(null);

      // Buscar FéNamoro Data
      supabase.from('dating_profiles').select('is_premium, testimony_video_url').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setFormData(prev => ({
              ...prev,
              is_premium: data.is_premium || false,
              testimony_video_url: data.testimony_video_url || ""
            }));
          }
        });
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

      // 1. Upload de Avatar
      if (avatarFile) {
        const url = await uploadMedia(avatarFile, { bucket: 'avatars', folder: 'profiles' });
        if (!url) throw new Error("Falha no upload do avatar");
        currentAvatarUrl = url;
      }

      // 2. Upload de Banner
      if (bannerFile) {
        const url = await uploadMedia(bannerFile, { bucket: 'avatars', folder: 'banners' });
        if (!url) throw new Error("Falha no upload do banner");
        currentBannerUrl = url;
      }
      
      const updatePayload = { ...formData };
      delete (updatePayload as any).is_premium;
      delete (updatePayload as any).testimony_video_url;

      const profilePayload = {
        ...updatePayload,
        avatar_url: currentAvatarUrl,
        banner_url: currentBannerUrl
      };

      // Limpa os dados
      const cleanedData = Object.fromEntries(
        Object.entries(profilePayload).map(([key, value]) => [
          key, 
          value === "" ? null : value
        ])
      );
      
      const { error } = await supabase
        .from('profiles')
        .update(cleanedData)
        .eq('id', userId);

      if (error) throw error;

      // Salva no FéNamoro
      const { error: datingError } = await supabase
        .from('dating_profiles')
        .update({
          is_premium: formData.is_premium,
          testimony_video_url: formData.testimony_video_url || null
        })
        .eq('id', userId);
      
      if (datingError) throw datingError;

      const finalProfile = { 
        ...user, 
        ...cleanedData,
        avatar_url: currentAvatarUrl,
        banner_url: currentBannerUrl
      };
      
      // Sincronização com Cache e UI
      setStoredProfile(finalProfile);
      
      toast.success("Perfil atualizado com sucesso!");
      onUpdate(finalProfile);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-white/10 w-full max-w-xl max-h-[90vh] overflow-hidden rounded-[32px] flex flex-col shadow-2xl text-gray-900 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold">Editar Perfil</h2>
          <button 
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="px-6 py-2.5 rounded-xl bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {(isSaving || isUploading) ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Salvando...</span>
              </>
            ) : <><Save className="w-4 h-4" /> Salvar</>}
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-8 no-scrollbar">
          
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
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none text-gray-900 dark:text-white"
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
              <label className="text-xs font-bold text-gray-500 ml-1">Sobre Você (Bio)</label>
              <textarea 
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none resize-none text-gray-900 dark:text-white"
                placeholder="Conte um pouco sobre sua caminhada com a fé..."
              />
            </div>
          </section>

          {/* Privacidade do Perfil */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Privacidade do Perfil</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'public', label: 'Público', icon: Globe, desc: 'Todos veem' },
                { id: 'private', label: 'Privado', icon: Lock, desc: 'Só seguidores' },
                { id: 'friends', label: 'Amigos', icon: Users, desc: 'Apenas amigos' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormData({...formData, visibility_type: option.id})}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group",
                    formData.visibility_type === option.id
                      ? "bg-whatsapp-teal/10 border-whatsapp-teal" 
                      : "bg-gray-50 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                  )}
                >
                  <option.icon className={cn(
                    "w-4 h-4",
                    formData.visibility_type === option.id
                      ? "text-whatsapp-teal" 
                      : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  <div className="text-center">
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-tight",
                      formData.visibility_type === option.id
                        ? "text-whatsapp-teal" 
                        : "text-gray-500"
                    )}>{option.label}</p>
                    <p className="text-[7px] text-gray-400 leading-none">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Preferências e Notificações */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <Sun className="w-4 h-4" /> Preferências e Notificações
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'notify_likes', label: 'Curtidas' },
                { id: 'notify_comments', label: 'Comentários' },
                { id: 'notify_follows', label: 'Novos Seguidores' },
                { id: 'notify_reposts', label: 'Republicações' },
                { id: 'notify_mentions', label: 'Marcações' },
                { id: 'notify_hashtags', label: 'Hashtags Seguidas' },
                { id: 'show_counters', label: 'Exibir Contadores' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormData({...formData, [item.id]: !(formData as any)[item.id]})}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{item.label}</span>
                  <div className={cn(
                    "w-8 h-4 rounded-full relative transition-all duration-300",
                    (formData as any)[item.id] ? "bg-whatsapp-green" : "bg-gray-300 dark:bg-white/20"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300",
                      (formData as any)[item.id] ? "right-0.5" : "left-0.5"
                    )} />
                  </div>
                </button>
              ))}
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
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none text-gray-900 dark:text-white"
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
                  <option value="" className="bg-[#1a1a1a] text-white">Selecione...</option>
                  <option value="masculino" className="bg-[#1a1a1a] text-white">Masculino</option>
                  <option value="feminino" className="bg-[#1a1a1a] text-white">Feminino</option>
                </select>
              </div>
            </div>

            {/* Localização */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 ml-1">País</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none text-gray-900 dark:text-white"
                    placeholder="Ex: Brasil"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">Estado</label>
                  <input 
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none"
                    placeholder="Ex: SP"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">Cidade</label>
                  <input 
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none"
                    placeholder="Sua cidade"
                  />
                </div>
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

          {/* Configurações FéNamoro */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-whatsapp-teal mb-4 flex items-center gap-2">
               <Heart className="w-4 h-4" /> Configurações FéNamoro
            </h3>
            
            {/* Status Premium — Exclusivo para Administradores */}
            {isAdmin && (
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-whatsapp-teal/20">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold flex items-center gap-2">
                     Status Premium 💎 <span className="text-[10px] bg-whatsapp-teal/20 text-whatsapp-teal px-2 py-0.5 rounded-md font-semibold">Admin</span>
                  </span>
                  <p className="text-xs text-gray-500">Liberar recursos pagos sem cobrar Kiwify</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, is_premium: !formData.is_premium})}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
                    formData.is_premium ? "bg-whatsapp-green text-whatsapp-dark" : "bg-gray-100 dark:bg-white/10 text-gray-400"
                  )}
                >
                  {formData.is_premium ? "Ativo" : "Inativo"}
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 ml-1">Vídeo Testemunho (URL)</label>
              <div className="relative">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  value={formData.testimony_video_url}
                  onChange={(e) => setFormData({...formData, testimony_video_url: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20 outline-none text-gray-900 dark:text-white"
                  placeholder="https://youtu.be/..."
                />
              </div>
            </div>
          </section>

          {/* Links e Redes Sociais */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Conectar Redes Sociais</h3>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { name: 'Instagram', Icon: Instagram, key: 'instagram_url' },
                { name: 'WhatsApp', Icon: MessageCircle, key: 'whatsapp_url' },
                { name: 'LinkedIn', Icon: Linkedin, key: 'linkedin_url' },
                { name: 'YouTube', Icon: Youtube, key: 'youtube_url' },
                { name: 'Site / Blog', Icon: Globe, key: 'website_url' },
              ].map((social) => (
                <div key={social.key} className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <social.Icon className="w-4 h-4 text-gray-500 group-focus-within:text-whatsapp-green transition-colors" />
                  </div>
                  <input 
                    type="text"
                    value={(formData as any)[social.key] || ""}
                    onChange={(e) => setFormData({...formData, [social.key]: e.target.value})}
                    placeholder={`Link do ${social.name}`}
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
