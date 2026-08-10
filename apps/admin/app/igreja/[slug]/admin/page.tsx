"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Shield, Save, Edit3, Camera, Image as ImageIcon, ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image-compression";
import { useRouter } from "next/navigation";
import { ImageCropperModal } from "@/components/profile/ImageCropperModal";

export default function ChurchAdminPanel({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [church, setChurch] = useState<any>(null);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slogan: "",
    description: "",
    youtube_live_url: "",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [bannerCropperFile, setBannerCropperFile] = useState<string | null>(null);

  const handleBannerCropComplete = async (blob: Blob) => {
    if (bannerCropperFile && bannerCropperFile.startsWith('blob:')) {
      URL.revokeObjectURL(bannerCropperFile);
    }
    setBannerCropperFile(null);
    const file = new File([blob], `banner-${Date.now()}.jpg`, { type: "image/jpeg" });
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    loadAdminData();
  }, [params.slug]);

  async function loadAdminData() {
    const { data: churchData } = await supabase
      .from('churches')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (!churchData) {
      setLoading(false);
      return;
    }

    setChurch(churchData);
    setFormData({
      name: churchData.name || "",
      slogan: churchData.slogan || "",
      description: churchData.description || "",
      youtube_live_url: churchData.youtube_live_url || "",
    });
    setBannerPreview(churchData.banner_url || "");

    // Membros pendentes
    const { data: pending } = await supabase
      .from('church_join_requests')
      .select('*, user:profiles(id, full_name, avatar_url, username)')
      .eq('church_id', churchData.id)
      .eq('status', 'pending');

    setPendingMembers(pending || []);

    // Todos os membros
    const { data: members } = await supabase
      .from('church_members')
      .select('*, user:profiles(id, full_name, avatar_url, username)')
      .eq('church_id', churchData.id);

    setAllMembers(members || []);

    // Grupos
    const { data: groupData } = await supabase
      .from('church_groups')
      .select('*')
      .eq('church_id', churchData.id);

    setGroups(groupData || []);
    setLoading(false);
  }

  async function approveMember(requestId: string, userId: string) {
    await supabase.from('church_join_requests').update({ status: 'approved' }).eq('id', requestId);
    await supabase.from('church_members').insert({
      church_id: church.id,
      user_id: userId,
      role: 'member',
      approved: true
    });
    await supabase.from('profiles').update({ church: church.name }).eq('id', userId);
    toast.success("Membro aprovado!");
    loadAdminData();
  }

  async function rejectMember(requestId: string) {
    await supabase.from('church_join_requests').update({ status: 'rejected' }).eq('id', requestId);
    toast.success("Pedido rejeitado.");
    loadAdminData();
  }

  async function handleUpdateChurch(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let finalBannerUrl = church.banner_url;

      if (bannerFile) {
        const compressed = await compressImage(bannerFile, 1200, 0.8);
        const path = `churches/${church.slug}-banner-${Date.now()}.webp`;
        const { data } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true });
        if (data) finalBannerUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }

      const newSlug = formData.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      const { error } = await supabase.from('churches').update({
        name: formData.name,
        slogan: formData.slogan,
        slug: newSlug,
        description: formData.description,
        youtube_live_url: formData.youtube_live_url,
        banner_url: finalBannerUrl
      }).eq('id', church.id);

      if (error) throw error;
      toast.success("Igreja atualizada com sucesso!");
      setIsEditing(false);
      
      // Se o slug mudou, redireciona para a nova URL
      if (newSlug !== church.slug) {
        router.push(`/igreja/${newSlug}/admin`);
      } else {
        loadAdminData();
      }
      
      // Atualiza o layout pai (onde fica o banner oficial)
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex items-center justify-center text-gray-900 dark:text-white">Carregando painel...</div>;

  return (
    <div className="text-gray-900 dark:text-white pb-20 max-w-5xl mx-auto px-6">
      
      <div className="flex justify-center items-center mb-6">
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="px-6 py-2 bg-[#25D366]/10 text-[#25D366] rounded-full font-bold flex items-center gap-2 hover:bg-[#25D366]/20 transition-all border border-[#25D366]/20"
        >
          {isEditing ? 'Cancelar Edição' : <><Edit3 className="w-4 h-4" /> Configurações da Igreja</>}
        </button>
      </div>

      {/* Editor Form */}
      <div className="pt-2">
        {isEditing ? (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-[#25D366]">
              <Settings className="w-6 h-6" /> Dados da Igreja
            </h2>
            <form onSubmit={handleUpdateChurch} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Alterar Banner Principal (16:9)</label>
                <label className="block w-full cursor-pointer bg-white dark:bg-[#1A2429] border border-dashed border-black/20 dark:border-white/20 rounded-2xl overflow-hidden hover:border-[#25D366]/50 transition-all aspect-video flex items-center justify-center relative group">
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    if (e.target.files?.[0]) {
                      setBannerCropperFile(URL.createObjectURL(e.target.files[0]));
                      // limpa o input para poder selecionar o mesmo arquivo se der cancelar no crop
                      e.target.value = '';
                    }
                  }} />
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400 font-bold relative z-10 p-6 text-center">
                      <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                      <span>Clique para trocar a foto de fundo</span>
                      <span className="text-xs font-normal opacity-70">Recomendado: 1200x675 pixels</span>
                    </div>
                  )}
                  {/* overlay escuro para o texto sempre aparecer por cima ou hover */}
                  {bannerPreview && (
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all z-10 text-white font-bold gap-2 backdrop-blur-sm">
                       <Camera className="w-8 h-8 mb-1" /> 
                       Trocar Banner
                     </div>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Nome da Igreja</label>
                  <input 
                    required type="text" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Slogan / Subtítulo</label>
                  <input 
                    type="text" 
                    value={formData.slogan} onChange={e => setFormData({...formData, slogan: e.target.value})}
                    className="w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Link da Transmissão (YouTube)</label>
                <input 
                  type="text" 
                  placeholder="Ex: https://youtube.com/live/..."
                  value={formData.youtube_live_url} onChange={e => setFormData({...formData, youtube_live_url: e.target.value})}
                  className="w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Sobre a Igreja</label>
                <textarea 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white dark:bg-[#1A2429] border border-black/10 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white focus:outline-none focus:border-[#25D366] h-32 resize-none"
                />
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-4">
                <button type="button" onClick={() => setIsEditing(false)} className="w-full sm:w-auto px-6 py-4 bg-black/5 dark:bg-white/5 rounded-2xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all text-center">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="w-full sm:w-auto px-6 py-4 bg-[#25D366] text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-[#00A884] transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : <><Save className="w-5 h-5" /> Salvar</>}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* === SEÇÃO DE APROVAÇÃO DE MEMBROS === */}
            <div className="bg-black/5 dark:bg-[#111B21] rounded-3xl p-6 sm:p-8 mb-8 border border-black/5 dark:border-transparent">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-orange-500 dark:text-orange-400">
                <Users className="shrink-0" /> 
                <span className="truncate">Pedidos</span>
                <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-sm font-black shrink-0">{pendingMembers.length}</span>
              </h2>

              {pendingMembers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 py-12 text-center">Nenhum pedido pendente no momento. A paz do Senhor!</p>
              ) : (
                <div className="space-y-6">
                  {pendingMembers.map((req) => (
                    <div key={req.id} className="py-4">
                      <div className="flex items-start gap-5">
                        <img 
                          src={req.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user?.full_name || 'U')}&background=random`} 
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user?.full_name || 'U')}&background=random` }}
                          className="w-16 h-16 rounded-2xl object-cover" 
                        />
                        <div className="flex-1">
                          <p className="font-bold text-lg text-gray-900 dark:text-white">{req.user?.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{req.user?.username}</p>
                          {req.message && <div className="mt-4 bg-black/5 dark:bg-black/30 p-4 rounded-2xl text-sm italic text-gray-700 dark:text-gray-300">"{req.message}"</div>}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-8">
                        <button onClick={() => rejectMember(req.id)} className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl font-bold transition-all">
                          Rejeitar
                        </button>
                        <button onClick={() => approveMember(req.id, req.user.id)} className="flex-1 py-4 bg-[#25D366] text-black rounded-2xl font-bold hover:bg-[#00A884] transition-all">
                          Aprovar Membro
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Membros */}
            <div className="bg-black/5 dark:bg-[#111B21] rounded-3xl p-6 sm:p-8 mb-8 border border-black/5 dark:border-transparent">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                <Users className="shrink-0" /> 
                <span className="truncate">Membros</span>
                <span className="bg-black/10 dark:bg-white/10 px-3 py-1 rounded-full text-sm font-black shrink-0">{allMembers.length}</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-4 py-3">
                    <img 
                      src={member.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.full_name || 'U')}&background=random`} 
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.full_name || 'U')}&background=random` }}
                      className="w-12 h-12 rounded-full object-cover" 
                    />
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">{member.user?.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{member.user?.username}</p>
                    </div>
                    <span className="text-xs px-3 py-1 bg-[#25D366]/10 text-[#25D366] rounded-full font-medium capitalize">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Células e Ministérios */}
            <div className="bg-black/5 dark:bg-[#111B21] rounded-3xl p-6 sm:p-8 mb-8 border border-black/5 dark:border-transparent">
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Células e Ministérios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map((group) => (
                  <div key={group.id} className="py-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">{group.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tipo: {group.type}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {bannerCropperFile && (
        <ImageCropperModal
          isOpen={true}
          image={bannerCropperFile}
          onCropComplete={handleBannerCropComplete}
          onClose={() => setBannerCropperFile(null)}
          aspect={16 / 9}
          isCircular={false}
          title="Cortar Banner da Igreja"
        />
      )}
    </div>
  );
}
