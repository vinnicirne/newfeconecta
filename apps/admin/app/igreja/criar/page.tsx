"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Save, User, ShieldCheck, Camera, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/image-compression";

export default function CreateChurchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    slogan: "",
    slug: "",
    description: "",
    role: "admin", // admin, pastor, lider
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .single();
        
      setCurrentUser({ id: user.id, ...profile });
    }
    loadUser();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let bannerUrl = "";

      // Upload do Banner com compressão
      if (bannerFile) {
        const compressed = await compressImage(bannerFile, 1200, 0.8);
        const path = `churches/${formData.slug}-banner-${Date.now()}.webp`;
        const { data, error } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true });
        if (data) {
          bannerUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
        }
      }

      // 1. Cria a igreja
      const { data: church, error: churchError } = await supabase
        .from("churches")
        .insert({
          name: formData.name,
          slogan: formData.slogan,
          slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          description: formData.description,
          banner_url: bannerUrl || null,
          pastor_id: formData.role === 'pastor' ? currentUser?.id : null // só seta pastor_id se ele for pastor
        })
        .select()
        .single();

      if (churchError) throw churchError;

      // 2. Adiciona o usuário como membro aprovado e define a role
      const { error: memberError } = await supabase
        .from("church_members")
        .insert({
          church_id: church.id,
          user_id: currentUser.id,
          role: formData.role, // "admin", "pastor", etc
          approved: true
        });

      if (memberError) throw memberError;

      // 3. Marca a igreja no perfil do criador
      await supabase
        .from("profiles")
        .update({ church: church.name })
        .eq("id", currentUser.id);

      toast.success("Igreja criada com sucesso! 🙌");
      router.push(`/igreja/${church.slug}/admin`);
    } catch (error: any) {
      toast.error("Erro ao criar a igreja: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pt-24 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#25D366]/20 flex items-center justify-center text-[#25D366]">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Fundar Nova Casa</h1>
            <p className="text-gray-400">Registre sua igreja ou comunidade no FéConecta.</p>
          </div>
        </div>

        <div className="bg-[#111B21] rounded-3xl p-8 border border-white/5">
          <form onSubmit={handleCreate} className="space-y-6">
            
            <div className="bg-[#1A2429] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 bg-[#25D366]/10 rounded-full flex items-center justify-center text-[#25D366]">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Responsável pelo Registro</p>
                <p className="font-bold">{currentUser?.full_name || "Carregando..."}</p>
              </div>
            </div>

            {/* Upload de Imagens */}
            <div className="grid grid-cols-1 gap-6">

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Banner Principal</label>
                <label className="block w-full cursor-pointer bg-[#1A2429] border border-dashed border-white/20 rounded-3xl p-6 text-center hover:border-[#25D366]/50 transition-all relative overflow-hidden h-40">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setBannerFile(e.target.files[0]);
                        setBannerPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }} 
                  />
                  {bannerPreview ? (
                    <img src={bannerPreview} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-sm">Envie uma foto da igreja (Banner)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Sua Função na Igreja</label>
                <select 
                  required
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-[#1A2429] border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#25D366]/60 transition-colors"
                >
                  <option value="admin">Administrador(a)</option>
                  <option value="pastor">Pastor(a) Sênior</option>
                  <option value="leader">Líder de Ministério</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-300">Nome da Igreja</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Igreja Batista Central"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#1A2429] border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#25D366]/60 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Link Personalizado</label>
              <div className="flex bg-[#1A2429] border border-white/10 rounded-2xl overflow-hidden focus-within:border-[#25D366]/60 transition-colors">
                <div className="px-4 py-4 bg-black/20 text-gray-500 text-sm flex items-center">
                  feconecta.com/igreja/
                </div>
                <input 
                  required
                  type="text" 
                  placeholder="batista-central"
                  value={formData.slug}
                  onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")})}
                  className="w-full bg-transparent p-4 text-white focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-500">Este será o link oficial da sua igreja no app.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Slogan / Subtítulo</label>
              <input 
                type="text" 
                placeholder="Ex: Um lugar de recomeços"
                value={formData.slogan}
                onChange={e => setFormData({...formData, slogan: e.target.value})}
                className="w-full bg-[#1A2429] border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#25D366]/60 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-300">Descrição Curta</label>
              <textarea 
                placeholder="Conte um pouco sobre a visão da sua comunidade..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-[#1A2429] border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-[#25D366]/60 transition-colors resize-none h-32"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#25D366] text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#00A884] transition-all disabled:opacity-50"
              >
                {loading ? "Criando Casa..." : (
                  <>
                    <Save size={20} /> Registrar Igreja e Acessar Painel
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
