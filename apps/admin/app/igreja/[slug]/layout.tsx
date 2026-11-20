"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Home, Video, BookOpen, Users, Shield, ArrowLeft, Clock, Heart, Search, MoreVertical, ChevronRight, Globe2, ChevronDown, Settings, Copy, LogOut, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const requestId = ++requestVersion.current;
    setChurch(null);
    setRole(null);
    setCurrentUser(null);
    setIsMember(false);
    setJoinStatus(null);
    setPendingCount(0);
    loadChurchAndUser(requestId);
    return () => {
      if (requestVersion.current === requestId) requestVersion.current += 1;
    };
  }, [params.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChurchAndUser(requestId?: number) {
    const activeRequest = requestId ?? ++requestVersion.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [authResult, churchResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('churches')
          .select('*, church_members(count)')
          .eq('slug', params.slug)
          .maybeSingle(),
      ]);
      if (activeRequest !== requestVersion.current) return;
      if (authResult.error) throw authResult.error;
      if (churchResult.error) throw churchResult.error;

      const churchData = churchResult.data;
      if (!churchData) {
        setChurch(null);
        return;
      }

      const realMemberCount = (churchData.church_members as any)?.[0]?.count ?? churchData.member_count ?? 0;
      setChurch({ ...churchData, member_count: realMemberCount });

      const user = authResult.data.user;
      if (!user) {
        setCurrentUser(null);
        setIsMember(false);
        setJoinStatus(null);
        return;
      }

      const [memberResult, profileResult] = await Promise.all([
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
          .maybeSingle(),
      ]);
      if (activeRequest !== requestVersion.current) return;
      if (memberResult.error) throw memberResult.error;
      if (profileResult.error) throw profileResult.error;

      const member = memberResult.data;
      setCurrentUser({ ...user, ...profileResult.data });

      if (member?.approved) {
        setRole(member.role);
        setIsMember(true);
        if (['admin', 'pastor'].includes(member.role)) {
          const { count, error } = await supabase
            .from('church_join_requests')
            .select('*', { count: 'exact', head: true })
            .eq('church_id', churchData.id)
            .eq('status', 'pending');
          if (activeRequest !== requestVersion.current) return;
          if (error) throw error;
          setPendingCount(count || 0);
        }
      } else {
        setIsMember(false);
        const { data: request, error } = await supabase
          .from('church_join_requests')
          .select('status')
          .eq('church_id', churchData.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeRequest !== requestVersion.current) return;
        if (error) throw error;
        setJoinStatus(request?.status === 'pending' ? 'pending' : null);
      }
    } catch (error) {
      if (activeRequest === requestVersion.current) {
        console.error('[Igreja] Erro ao carregar comunidade:', error);
        setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar esta igreja.');
      }
    } finally {
      if (activeRequest === requestVersion.current) setLoading(false);
    }
  }

  if (loading || (church && church.slug !== params.slug)) return <div role="status" aria-live="polite" className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando igreja…</div>;
  if (loadError) return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p role="alert">Não foi possível carregar esta igreja.</p>
      <button type="button" onClick={() => loadChurchAndUser()} className="px-5 py-2.5 rounded-xl bg-whatsapp-teal text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">Tentar novamente</button>
      <Link href="/igreja" className="text-sm underline">Voltar à lista de igrejas</Link>
    </div>
  );
  if (!church) return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p role="status">Igreja não encontrada.</p>
      <Link href="/igreja" className="text-sm underline underline-offset-4">Voltar à lista de igrejas</Link>
    </div>
  );

  const tabs = [
    { name: 'Início', path: `/igreja/${params.slug}`, icon: <Home size={18} /> },
    { name: 'Ministérios', path: `/igreja/${params.slug}/ministerios`, icon: <Heart size={18} /> },
    { name: 'Culto', path: `/igreja/${params.slug}/culto`, icon: <Video size={18} /> },
    { name: 'Discipulado', path: `/igreja/${params.slug}/discipulado`, icon: <BookOpen size={18} /> },
    { name: 'Membros', path: `/igreja/${params.slug}/membros`, icon: <Users size={18} /> },
  ];

  const isDeepGroupRoute = pathname.includes('/celula/') || (pathname.includes('/ministerios/') && pathname.split('/').length > 4);

  const handleJoinChurch = async () => {
    if (!currentUser) return router.push('/login');
    if (joinStatus === 'loading') return;
    setJoinStatus('loading');
    try {
      // church_join_requests não tem chave única (church_id, user_id), então
      // upsert com onConflict falha. Reaproveita pedido pendente e cria outro
      // registro quando a solicitação anterior foi rejeitada.
      const { data: existing, error: lookupError } = await supabase
        .from('church_join_requests')
        .select('id, status')
        .eq('church_id', church.id)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existing?.status === 'pending') {
        setJoinStatus('pending');
        toast.info('Sua solicitação já está aguardando aprovação.');
        return;
      }

      const { error } = await supabase.from('church_join_requests').insert({
        church_id: church.id,
        user_id: currentUser.id,
        status: 'pending',
      });
      if (error) throw error;

      toast.success('Solicitação enviada! Aguarde a aprovação.');
      setJoinStatus('pending');
    } catch (error) {
      console.error('[Igreja] Erro ao solicitar entrada:', error);
      toast.error(error instanceof Error ? `Não foi possível solicitar entrada: ${error.message}` : 'Não foi possível solicitar entrada. Tente novamente.');
      setJoinStatus(null);
    }
  };

  const handleCopyChurchLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link da comunidade copiado.');
    } catch {
      toast.error('Não foi possível copiar o link. Copie-o pela barra do navegador.');
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
          <img src={church.banner_url} className="absolute inset-0 w-full h-full object-cover" alt={`Capa de ${church.name}`} width={1600} height={900} fetchPriority="high" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Navigation / Header Actions (Overlapping the banner) */}
        <div 
          className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)' }}
        >
          <Link href="/" aria-label="Voltar ao feed" className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-all border border-white/10 flex items-center gap-1.5 pr-3 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Feed
          </Link>
          
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsSearchOpen(true)} aria-label="Buscar nesta igreja" className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-all border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Search className="w-5 h-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Mais opções da igreja" className="p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-all border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border rounded-xl shadow-lg">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleCopyChurchLink}>
                  <Copy className="w-4 h-4" /> Copiar Link
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
