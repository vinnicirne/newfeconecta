"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase as supabaseClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// BUILD_TS: 2026-08-12T14:00:00
const PUBLIC_ROUTES = ["/login", "/register"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncingProfile, setIsSyncingProfile] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(true);
  const initialized = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const { requestPermission, listenToForegroundMessages, listenToInternalNotifications } = usePushNotifications();
  // Use refs to hold latest versions of these functions without causing re-renders
  const requestPermissionRef = useRef(requestPermission);
  const listenForegroundRef = useRef(listenToForegroundMessages);
  const listenInternalRef = useRef(listenToInternalNotifications);
  useEffect(() => { requestPermissionRef.current = requestPermission; }, [requestPermission]);
  useEffect(() => { listenForegroundRef.current = listenToForegroundMessages; }, [listenToForegroundMessages]);
  useEffect(() => { listenInternalRef.current = listenToInternalNotifications; }, [listenToInternalNotifications]);

  // Logger de Auditoria (Dashboard de Controle) - Totalmente Assíncrono e Não Bloqueante
  const logSystemStatus = useCallback(async (module: string, message: string, severity: 'info' | 'medium' | 'high' = 'info') => {
    // Dispara em background sem await para não travar a UI
    supabaseClient.from('system_errors').insert({
      module,
      error_message: message,
      severity
    }).then(({ error }) => {
      if (error?.message?.includes('severity')) {
        // Fallback para quando o schema cache do Supabase está desatualizado
        supabaseClient.from('system_errors').insert({
          module,
          error_message: message
        });
      }
    });
  }, []);

  // Função Nuclear para Ativar Serviços (Prioridade Total ao Perfil)
  // CRITICAL: Uses refs to avoid re-creating this callback on every render (infinite loop fix)
  const activateServices = useCallback(async (userId: string) => {
    if (initialized.current) return;
    // Mark as initialized FIRST to prevent any re-entry race condition
    initialized.current = true;
    
    try {
      // 1. PRIORIDADE ABSOLUTA: Busca de Dados para Hidratação
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, avatar_url, username, full_name, role, city, phone, birthdate, accepted_terms')
        .eq('id', userId)
        .single();

      if (profile) {
        localStorage.setItem('fc_profile_cache', JSON.stringify(profile));
        setUserRole(profile.role);
        
        const complete = Boolean(profile.city && profile.phone && profile.birthdate && profile.accepted_terms);
        setIsProfileComplete(complete);

        window.dispatchEvent(new CustomEvent('profile-hydrated', { detail: profile }));
        
        if (!complete && pathname !== '/complete-profile') {
           router.replace('/complete-profile');
        }
      } else if (profileError) {
        if (!profileError.message?.includes('lock') && !profileError.message?.includes('steal')) {
          console.error("Erro ao buscar perfil:", profileError);
        }
      }

      // 2. SERVIÇOS DE BACKGROUND - via refs to avoid dep loop
      await requestPermissionRef.current(userId).catch(() => {});
      listenForegroundRef.current();
      listenInternalRef.current(userId);
      
    } catch (e: any) {
      console.error("Falha na ativação de serviços:", e.message || e);
    } finally {
      setIsSyncingProfile(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // 1. Motor de Sessão Protegido
  useEffect(() => {
    const initSession = async () => {
      try {
        // Tenta buscar a sessão. Se houver lock, o Supabase vai esperar,
        // mas nós já temos o listener onAuthStateChange ativo para capturar o resultado.
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
           // Se houver erro de lock (steal/contention), ignoramos e deixamos o listener resolver
           if (!error.message?.includes('lock') && !error.message?.includes('steal')) {
              console.error("Auth Error:", error);
           }
        }

        if (session?.user) {
          setAuthorized(true);
          setUserId(session.user.id);
          activateServices(session.user.id).catch((e) => {
            console.warn("Falha ao ativar serviços (não crítico):", e);
            setIsSyncingProfile(false);
          });
        } else {
          // Se não houver sessão, verifica se estamos em rota protegida
          const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/post/");
          if (!isPublicRoute) {
            router.push('/login');
          }
        }
      } catch (err: any) {
        console.error("Auth Guard Failure:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession().catch((err: any) => {
      if (err?.name !== 'AbortError' && !err?.message?.includes('steal')) {
        console.error('[AuthGuard] initSession unhandled:', err);
      }
      setLoading(false);
    });

    // Listener persistente: Gerencia login/logout dinâmico com proteção contra lock contention
    let subscription: any = null;
    try {
      const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
        setAuthorized(!!session?.user);
        
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          setUserId(session.user.id);
          activateServices(session.user.id).catch((err: any) => {
            console.error('[AuthGuard] activateServices unhandled:', err);
            setIsSyncingProfile(false);
          });
        }

        if (event === 'SIGNED_OUT') {
          initialized.current = false;
          setUserRole(null);
          localStorage.removeItem('fc_profile_cache');
          router.replace("/login");
        }
      });
      subscription = data.subscription;
    } catch (e) {
      console.warn("[AuthGuard] onAuthStateChange lock contention ignored.");
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, activateServices]);

  // 2. Sentinela de Rota (Silenciosa e Instantânea)
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/post/");
    
    if (process.env.NODE_ENV === 'development') {
      console.log("🛡️ [Auth] Navegando para:", pathname, { authorized, isPublic });
    }

    if (!authorized && !isPublic) {
      router.replace("/login");
      return;
    }
    
    if (authorized) {
      if (!isSyncingProfile) {
        if (!isProfileComplete && pathname !== "/complete-profile") {
          router.replace("/complete-profile");
          return;
        }
        if (isProfileComplete && pathname === "/complete-profile") {
          router.replace("/");
          return;
        }
      }
      
      if (PUBLIC_ROUTES.includes(pathname)) {
        router.replace("/");
        return;
      }
    }

    // Trava de Segurança Admin
    if (pathname.startsWith("/admin")) {
        // Se ainda está sincronizando o perfil real do banco, não redirecionamos por segurança
        if (isSyncingProfile) return;

        if (userRole !== 'admin') {
          console.warn(`🛡️ [Segurança] Acesso negado para usuário ${userRole || 'comum'} em: ${pathname}`);
          router.replace("/");
        }
      }
  }, [pathname, authorized, loading, router, userRole, isSyncingProfile]);

  // 3. Batimento Cardíaco (Presença Real)
  useEffect(() => {
    if (!authorized || !userId) return;

    const updatePresence = async () => {
      if (typeof window !== 'undefined' && !window.navigator.onLine) return;
      try {
        await supabaseClient
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (err) {
        // Silencia erros de rede/timeout para não poluir o console
      }
    };

    // Atualiza agora e depois a cada 4 minutos
    updatePresence();
    const interval = setInterval(updatePresence, 1000 * 60 * 4);
    
    return () => clearInterval(interval);
  }, [authorized, userId]);

  // 4. Capacitor Hardware Back Button Interceptor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let listener: any = null;
    
    const initBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        listener = await App.addListener('backButton', () => {
          // Usa apenas a navegação do Next.js para voltar, sem fechar o app bruscamente
          router.back();
        });
      } catch (e) {
        // Ignora erro silenciosamente (ex: ambiente web/SSR sem plugin)
      }
    };
    
    initBackButton();
    
    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove().catch(() => {});
      }
    };
  }, [router]);

  const isPostRoute = pathname.startsWith("/post/");
  const isEntryRoute = PUBLIC_ROUTES.includes(pathname);
  const isPublicRoute = isEntryRoute || isPostRoute;

  // Determine if children should be visible
  let shouldRenderChildren = true;
  if (loading) shouldRenderChildren = false;
  else if (authorized && isEntryRoute) shouldRenderChildren = false;
  else if (!authorized && !isPublicRoute) shouldRenderChildren = false;
  else if (authorized && !isSyncingProfile && !isProfileComplete && pathname !== "/complete-profile") shouldRenderChildren = false;
  else if (pathname.startsWith("/admin") && userRole !== 'admin') shouldRenderChildren = false;

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300" suppressHydrationWarning>
      {loading && (
        <div suppressHydrationWarning className="fixed inset-0 bg-white dark:bg-black flex flex-col items-center justify-center z-[9999] transition-colors duration-300">
          <div className="w-16 h-16 rounded-full bg-whatsapp-teal/10 flex items-center justify-center mb-4 text-whatsapp-teal">
            <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.5em] animate-pulse">Sincronizando Fé...</span>
        </div>
      )}
      {/* Use null instead of hidden to avoid hydration mismatch (React Error #418) */}
      {shouldRenderChildren ? children : null}
    </div>
  );
}
