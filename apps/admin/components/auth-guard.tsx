"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase as supabaseClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { getStoredProfile, setStoredProfile } from "@/lib/profile-cache";

const PUBLIC_ROUTES = ["/login", "/register"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncingProfile, setIsSyncingProfile] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(() => {
    const cached = getStoredProfile();
    return Boolean(cached?.username || cached?.full_name || cached?.id);
  });
  const initialized = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const { requestPermission, listenToForegroundMessages, listenToInternalNotifications } = usePushNotifications();

  // 1. Reatividade: ouve alterações de perfil sem conflitos
  useEffect(() => {
    const handleHydrated = (e: any) => {
      const p = e.detail;
      if (p) {
        if (p.role) setUserRole(p.role);
        setIsProfileComplete(true);
        setIsSyncingProfile(false);
      }
    };
    window.addEventListener('profile-hydrated', handleHydrated);
    return () => window.removeEventListener('profile-hydrated', handleHydrated);
  }, []);

  const requestPermissionRef = useRef(requestPermission);
  const listenForegroundRef = useRef(listenToForegroundMessages);
  const listenInternalRef = useRef(listenToInternalNotifications);
  useEffect(() => { requestPermissionRef.current = requestPermission; }, [requestPermission]);
  useEffect(() => { listenForegroundRef.current = listenToForegroundMessages; }, [listenToForegroundMessages]);
  useEffect(() => { listenInternalRef.current = listenToInternalNotifications; }, [listenToInternalNotifications]);

  // 2. Ativação de Serviços e Busca do Perfil
  const activateServices = useCallback(async (userId: string) => {
    if (initialized.current) return;
    initialized.current = true;
    
    try {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        setStoredProfile(profile);
        setUserRole(profile.role);
        setIsProfileComplete(Boolean(profile.username || profile.full_name || profile.id));

        // 🔒 LGPD Art. 14 — Bloqueio de menores sem aprovação parental
        // guardian_approved = false significa que o responsável ainda não autorizou
        if (profile.is_minor === true && profile.guardian_approved === false) {
          const guardianEmail = profile.guardian_email
            ? encodeURIComponent(profile.guardian_email)
            : '';
          router.replace(`/guardian/pending?email=${guardianEmail}`);
          return;
        }
        // Disparo/Garantia de e-mail de boas-vindas em background (idempotente)
        if (profile.email) {
          fetch('/api/emails/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: profile.id,
              email: profile.email,
              name: profile.full_name || profile.username || 'Membro'
            })
          }).catch(() => {});
        }
      } else if (profileError) {
        console.warn("[AuthGuard] Erro ao carregar perfil:", profileError.message);
      }

      // Serviços em background
      await requestPermissionRef.current(userId).catch(() => {});
      listenForegroundRef.current();
      listenInternalRef.current(userId);
      
    } catch (e: any) {
      console.warn("[AuthGuard] Falha na ativação de serviços:", e.message || e);
    } finally {
      setIsSyncingProfile(false);
    }
  }, [router]);

  // 3. Motor de Sessão
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session?.user) {
          setAuthorized(true);
          setUserId(session.user.id);
          activateServices(session.user.id).catch(() => {
            setIsSyncingProfile(false);
          });
        } else {
          const isPostRoute = pathname.startsWith("/post/");
          const isGuardianRoute = pathname.startsWith("/guardian/");
          const isEntryRoute = PUBLIC_ROUTES.includes(pathname);
          const isPublic = isEntryRoute || isPostRoute || isGuardianRoute;

          if (!isPublic) {
            router.replace('/login');
          }
        }

      } catch (err: any) {
        console.error("Auth Guard Failure:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    let subscription: any = null;
    try {
      const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
        setAuthorized(!!session?.user);
        
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          setUserId(session.user.id);
          activateServices(session.user.id).catch(() => {
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
  }, [router, activateServices, pathname]);

  // 4. Sentinela de Rota
  useEffect(() => {
    if (loading) return;

    const isPostRoute = pathname.startsWith("/post/");
    const isGuardianRoute = pathname.startsWith("/guardian/");
    const isEntryRoute = PUBLIC_ROUTES.includes(pathname);
    const isPublic = isEntryRoute || isPostRoute || isGuardianRoute;

    if (!authorized && !isPublic) {
      router.replace("/login");
      return;
    }
    
    if (authorized && isEntryRoute) {
      router.replace("/");
    }
  }, [pathname, authorized, loading, router]);


  // 5. Batimento Cardíaco (Presença Real)
  useEffect(() => {
    if (!authorized || !userId) return;

    const updatePresence = async () => {
      if (typeof window !== 'undefined' && !window.navigator.onLine) return;
      try {
        await supabaseClient
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (_) {}
    };

    updatePresence();
    const interval = setInterval(updatePresence, 1000 * 60 * 4);
    
    return () => clearInterval(interval);
  }, [authorized, userId]);

  // 6. Capacitor Hardware Back Button Interceptor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let listener: any = null;
    
    const initBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        listener = await App.addListener('backButton', () => {
          router.back();
        });
      } catch (_) {}
    };
    
    initBackButton();
    
    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove().catch(() => {});
      }
    };
  }, [router]);

  const isPostRoute = pathname.startsWith("/post/");
  const isGuardianRoute = pathname.startsWith("/guardian/");
  const isEntryRoute = PUBLIC_ROUTES.includes(pathname);
  const isPublicRoute = isEntryRoute || isPostRoute || isGuardianRoute;

  let shouldRenderChildren = true;
  if (loading) shouldRenderChildren = false;
  else if (authorized && isEntryRoute) shouldRenderChildren = false;
  else if (!authorized && !isPublicRoute) shouldRenderChildren = false;

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
      {shouldRenderChildren ? children : null}
    </div>
  );
}
