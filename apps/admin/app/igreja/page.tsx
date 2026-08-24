"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Users, Flame, Plus, Shield, Home, Church, 
  ArrowRight, Sparkles, Building2, MapPin 
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/feed/BottomNav";
import { getStoredProfile, setStoredProfile } from "@/lib/profile-cache";

export default function ChurchesPage() {
  const [churches, setChurches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(() => getStoredProfile());

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // 1. Carrega Perfil do Usuário com Cache
        const cached = getStoredProfile();
        let activeUser = cached;
        if (!activeUser) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (p) activeUser = setStoredProfile(p);
          }
        }
        if (isMounted && activeUser) {
          setCurrentUser(activeUser);
        }

        const activeUserId = activeUser?.id;

        // 2. Busca Concorrente de Igrejas e Vínculos
        const [churchesRes, rolesRes] = await Promise.all([
          supabase
            .from('churches')
            .select('id, name, slug, banner_url, avatar_url, slogan, member_count, is_verified, description')
            .order('created_at', { ascending: false }),
          activeUserId
            ? supabase
                .from('church_members')
                .select('role, approved, church:churches(id, slug, name)')
                .eq('user_id', activeUserId)
                .eq('approved', true)
            : Promise.resolve({ data: [] } as any)
        ]);

        if (!isMounted) return;

        if (rolesRes.data) {
          setUserRoles(rolesRes.data);
        }

        if (churchesRes.data) {
          const sorted = (churchesRes.data || []).map((c: any) => ({
            ...c,
            member_count: c.member_count || 0
          })).sort((a: any, b: any) => b.member_count - a.member_count);
          
          setChurches(sorted);
        }
      } catch (err) {
        console.error("[Igrejas] Erro ao carregar congregações:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = churches.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.slogan && c.slogan.toLowerCase().includes(search.toLowerCase())) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-36 transition-colors duration-300">

      {/* Top Banner / Hero */}
      <div className="bg-card border-b border-border pt-16 pb-8 px-4 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal border border-whatsapp-teal/20">
                  <Church className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-whatsapp-teal">
                  Comunidade & Congregação
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                Encontre sua Casa Espiritual
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
                Descubra congregações locais, conecte-se aos cultos ao vivo, células e ministérios da sua igreja.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link 
                href="/igreja/criar" 
                className="px-6 py-3.5 bg-whatsapp-teal text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-whatsapp-tealLight transition-all text-sm shadow-lg shadow-whatsapp-teal/20 active:scale-95"
              >
                <Plus size={18} /> Registrar Minha Igreja
              </Link>
            </div>
          </div>

          {/* Minhas Igrejas Conectadas */}
          {userRoles.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                Minhas Igrejas ({userRoles.length})
              </p>
              <div className="flex flex-wrap gap-2.5">
                {userRoles.map((ur: any) => (
                  <Link 
                    key={ur.church?.slug || ur.church?.id} 
                    href={`/igreja/${ur.church?.slug}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-background border border-border hover:border-whatsapp-teal text-foreground text-xs font-bold transition-all shadow-sm group active:scale-95"
                  >
                    <Building2 className="w-4 h-4 text-whatsapp-teal group-hover:scale-110 transition-transform" />
                    <span>{ur.church?.name}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {ur.role}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Busca e Lista de Igrejas */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome da igreja, denominação ou ministério..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-whatsapp-teal transition-all shadow-md text-sm sm:text-base font-medium"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-card rounded-3xl overflow-hidden border border-border p-6 animate-pulse space-y-4 shadow-sm">
                <div className="h-40 bg-muted rounded-2xl" />
                <div className="h-6 bg-muted rounded-md w-3/4" />
                <div className="h-4 bg-muted rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : churches.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border shadow-sm px-4">
            <Church className="w-12 h-12 text-whatsapp-teal/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">Nenhuma igreja cadastrada ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Seja o pioneiro a registrar sua congregação e conectar seus fiéis no FéConecta.
            </p>
            <Link 
              href="/igreja/criar" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-whatsapp-teal text-white rounded-2xl font-bold text-sm shadow-md hover:bg-whatsapp-tealLight transition-all"
            >
              <Plus size={16} /> Cadastrar Igreja Agora
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border shadow-sm px-4">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">Nenhuma congregação encontrada para "{search}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((church) => (
              <Link href={`/igreja/${church.slug}`} key={church.id}>
                <div className="bg-card rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300 border border-border hover:border-whatsapp-teal/50 shadow-md group active:scale-[0.99] flex flex-col h-full">
                  
                  {/* Banner da Igreja */}
                  <div className="relative h-44 w-full bg-muted overflow-hidden">
                    {church.banner_url ? (
                      <img 
                        src={church.banner_url} 
                        alt={church.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-whatsapp-dark to-whatsapp-teal flex items-center justify-center opacity-80">
                        <Church className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {church.is_verified && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-whatsapp-teal text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                        <Shield className="w-3 h-3 fill-white" /> Verificada
                      </div>
                    )}
                  </div>

                  {/* Informações da Igreja */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xl sm:text-2xl text-foreground mb-1 group-hover:text-whatsapp-teal transition-colors">
                        {church.name}
                      </h3>
                      <p className="text-muted-foreground text-xs sm:text-sm mb-5 line-clamp-2 leading-relaxed">
                        {church.slogan || church.description || "Uma comunidade de fé e adoração no FéConecta."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs font-semibold">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-whatsapp-teal/10 text-whatsapp-teal rounded-full font-bold">
                        <Users className="w-4 h-4" /> {church.member_count || 0} membros
                      </div>
                      <div className="flex items-center gap-1.5 text-whatsapp-teal group-hover:translate-x-1 transition-transform font-bold">
                        <span>Conhecer</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Menu Mobile Inferior */}
      <BottomNav />
    </div>
  );
}
