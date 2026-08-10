"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Home, Image as ImageIcon, Video, BookOpen, Users, Shield, ArrowLeft, Clock, Heart, Search, MoreVertical, ChevronRight, Globe2, ChevronDown, Settings, Copy, Flag, LogOut, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChurchInviteModal } from "@/components/igreja/ChurchInviteModal";
import { ChurchMemberProfileModal } from "@/components/igreja/ChurchMemberProfileModal";
import { ChurchSearchModal } from "@/components/igreja/ChurchSearchModal";
import { ChurchContext } from "@/contexts/ChurchContext";

export default function ChurchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [church, setChurch] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadChurchAndUser();
  }, [params.slug]);

  async function loadChurchAndUser() {
    // ✅ Rodada 1: auth + church em paralelo — nenhuma depende da outra
    const [{ data: { user } }, { data: churchData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('churches')
        .select('*, church_members(count)')
        .eq('slug', params.slug)
        .single()
    ]);

    if (!churchData) {
      setLoading(false);
      return;
    }

    // ✅ Usa count real do join como fonte da verdade (fallback robusto)
    const realMemberCount = (churchData.church_members as any)?.[0]?.count ?? churchData.member_count ?? 0;
    setChurch({ ...churchData, member_count: realMemberCount });


    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ Rodada 2: permissão do membro + perfil do usuário
    const [{ data: member }, { data: profile }] = await Promise.all([
      supabase
        .from('church_members')
        .select('role, approved')
        .eq('church_id', churchData.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    ]);

    // Mescla o Auth User com os dados reais de perfil para uso nos componentes
    setCurrentUser({ ...user, ...profile });

    if (member?.approved) {
      setRole(member.role);
      setIsMember(true);

      // ✅ Rodada 3 (somente admins): pending count
      if (['admin', 'pastor'].includes(member.role)) {
        const { count } = await supabase
          .from('church_join_requests')
          .select('*', { count: 'exact', head: true })
          .eq('church_id', churchData.id)
          .eq('status', 'pending');
        setPendingCount(count || 0);
      }
    } else {
      setIsMember(false);
      const { data: req } = await supabase
        .from('church_join_requests')
        .select('status')
        .eq('church_id', churchData.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (req?.status === 'pending') {
        setJoinStatus('pending');
      }
    }

    setLoading(false);
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando Igreja...</div>;
  if (!church) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Igreja não encontrada.</div>;

  const tabs = [
    { name: 'Início', path: `/igreja/${params.slug}`, icon: <Home size={18} /> },
    { name: 'Ministérios', path: `/igreja/${params.slug}/ministerios`, icon: <Heart size={18} /> },
    { name: 'Culto', path: `/igreja/${params.slug}/culto`, icon: <Video size={18} /> },
    { name: 'Discipulado', path: `/igreja/${params.slug}/discipulado`, icon: <BookOpen size={18} /> },
    { name: 'Membros', path: `/igreja/${params.slug}/membros`, icon: <Users size={18} /> },
  ];

  const isAdminRoute = pathname.includes('/admin');

  const isDeepGroupRoute = pathname.includes('/celula/') || (pathname.includes('/ministerios/') && pathname.split('/').length > 4);

  const handleJoinChurch = async () => {
    if (!currentUser) return router.push('/login');
    setJoinStatus('loading');

    // ✅ upsert previne pedidos duplicados — se já existe, só atualiza para 'pending'
    const { error } = await supabase
      .from('church_join_requests')
      .upsert(
        { church_id: church.id, user_id: currentUser.id, status: 'pending' },
        { onConflict: 'church_id,user_id', ignoreDuplicates: false }
      );
      
    if (error) {
      toast.error('Erro ao solicitar entrada.');
      setJoinStatus(null);
    } else {
      toast.success('Solicitação enviada! Aguarde a aprovação.');
      setJoinStatus('pending');
    }
  };

  if (isDeepGroupRoute) {
    return (
      <div className="bg-background min-h-screen">
        {isMember ? children : (
          <div className="py-20 px-4 text-center text-foreground">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Comunidade Privada</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Você precisa ser membro desta igreja para acessar este grupo.</p>
            
            {joinStatus === 'pending' ? (
              <button disabled className="px-6 py-2.5 bg-muted text-muted-foreground font-semibold rounded-xl inline-flex items-center gap-2">
                <Clock className="w-4 h-4" /> Solicitação Pendente
              </button>
            ) : (
              <button onClick={handleJoinChurch} disabled={joinStatus === 'loading'} className="px-6 py-2.5 bg-whatsapp-teal text-white font-semibold rounded-xl hover:bg-whatsapp-tealLight transition-colors">
                {joinStatus === 'loading' ? 'Enviando...' : 'Solicitar Entrada'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }


  return (
    <div 
      className="min-h-screen bg-background text-foreground pb-20"
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Banner / Capa (16:9 Proporção aproximada) */}
      <div className="relative w-full aspect-video md:h-64 md:aspect-auto bg-gradient-to-br from-[#075E54] via-[#25D366] to-[#00A884]">
        {church.banner_url && (
          <img src={church.banner_url} className="absolute inset-0 w-full h-full object-cover" alt="Banner da Igreja" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Navigation / Header Actions (Overlapping the banner) */}
        <div 
          className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)' }}
        >
          <button onClick={() => router.back()} className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-all border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-2">
            <button onClick={() => setIsSearchOpen(true)} className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-all border border-white/10">
              <Search className="w-5 h-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-all border border-white/10 outline-none">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border rounded-xl shadow-lg">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => {
                  const url = window.location.href;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(url);
                    toast.success("Link da comunidade copiado!");
                  } else {
                    try {
                      const textArea = document.createElement("textarea");
                      textArea.value = url;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand("copy");
                      textArea.remove();
                      toast.success("Link da comunidade copiado!");
                    } catch (err) {
                      toast.error("Não foi possível copiar o link de forma automática.");
                    }
                  }
                }}>
                  <Copy className="w-4 h-4" /> Copiar Link
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10">
                  <Flag className="w-4 h-4" /> Denunciar Comunidade
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                  onSelect={async (e) => {
                    e.preventDefault();
                    if (!confirm("Você realmente deseja sair desta comunidade?")) return;
                    
                    if (currentUser && church) {
                      const { error, count } = await supabase
                        .from('church_members')
                        .delete({ count: 'exact' })
                        .eq('church_id', church.id)
                        .eq('user_id', currentUser.id);

                      if (error) {
                        toast.error("Erro ao sair da comunidade: " + error.message);
                        console.error(error);
                        return;
                      }

                      if (count === 0) {
                        console.warn("Nenhum registro encontrado para deletar em church_members.");
                      }

                      await supabase
                        .from('church_join_requests')
                        .delete()
                        .eq('church_id', church.id)
                        .eq('user_id', currentUser.id);

                      toast.success("Você saiu da comunidade.");
                      window.location.href = '/igreja';
                    }
                  }}
                >
                  <LogOut className="w-4 h-4" /> Sair do Grupo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Info da Igreja */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-4">
        <h1 className="text-2xl font-bold flex items-center justify-between">
          {church.name}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 mb-4">
          <Globe2 className="w-4 h-4" /> 
          <span>Grupo Público • {church.member_count || 0} membros</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <button onClick={() => setIsProfileOpen(true)} className="px-4 py-1.5 bg-muted rounded-full text-sm font-semibold flex items-center gap-2 shrink-0 hover:bg-muted/80 transition-colors">
            Perfil <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={() => setIsInviteOpen(true)} className="px-4 py-1.5 bg-whatsapp-teal text-white rounded-full text-sm font-semibold shrink-0 hover:bg-whatsapp-tealLight transition-colors">
            + Convidar
          </button>
          {['admin', 'pastor'].includes(role || '') && (
            <>
              {pendingCount > 0 && (
                <Link href={`/igreja/${params.slug}/admin/membros`} className="px-4 py-1.5 bg-orange-500/10 text-orange-500 rounded-full text-sm font-semibold shrink-0 flex items-center gap-2 hover:bg-orange-500/20 transition-colors">
                  <Bell className="w-4 h-4" /> {pendingCount} {pendingCount === 1 ? 'Pedido' : 'Pedidos'}
                </Link>
              )}
              <Link href={`/igreja/${params.slug}/admin`} className="px-4 py-1.5 bg-muted rounded-full text-sm font-semibold shrink-0 flex items-center gap-1 hover:bg-muted/80 transition-colors">
                <Settings className="w-4 h-4" /> Gerenciar
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Menu Superior (Abas Planas) */}
      {isMember && (
        <div className="border-b border-border mt-2">
          <div className="max-w-5xl mx-auto px-4 flex gap-2 md:gap-6 justify-between md:justify-start overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = pathname === tab.path || (pathname === `/igreja/${params.slug}` && tab.name === 'Feed');
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={cn(
                    "py-3 font-semibold text-[13px] md:text-sm whitespace-nowrap transition-colors relative",
                    isActive 
                      ? "text-whatsapp-teal" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.name}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-whatsapp-teal rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Conteúdo Dinâmico das Rotas */}
      <main className="max-w-5xl mx-auto mt-4 bg-background">
        {isMember ? (
          // ✅ Provê church, user, isMember e role para todos os filhos sem re-fetch
          <ChurchContext.Provider value={{ 
            church, 
            currentUser, 
            isMember, 
            role, 
            pendingCount, 
            setPendingCount,
            refreshChurchData: loadChurchAndUser
          }}>
            {children}
          </ChurchContext.Provider>
        ) : (
          <div className="py-20 px-4 text-center text-foreground">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Comunidade Privada</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Você precisa ser membro desta igreja para acessar o feed, grupos e outros conteúdos exclusivos.</p>
            
            {joinStatus === 'pending' ? (
              <button disabled className="px-6 py-2.5 bg-muted text-muted-foreground font-semibold rounded-xl inline-flex items-center gap-2">
                <Clock className="w-4 h-4" /> Solicitação Pendente
              </button>
            ) : (
              <button onClick={handleJoinChurch} disabled={joinStatus === 'loading'} className="px-6 py-2.5 bg-whatsapp-teal text-white font-semibold rounded-xl hover:bg-whatsapp-tealLight transition-colors">
                {joinStatus === 'loading' ? 'Enviando...' : 'Solicitar Entrada'}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Busca Modal */}
      <ChurchSearchModal 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen} 
        churchId={church.id}
        churchSlug={church.slug}
      />

      {/* Modals da Igreja */}
      <ChurchInviteModal 
        open={isInviteOpen} 
        onOpenChange={setIsInviteOpen} 
        churchName={church.name} 
        churchSlug={church.slug} 
      />
      
      <ChurchMemberProfileModal 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
        churchId={church.id} 
      />
    </div>
  );
}
