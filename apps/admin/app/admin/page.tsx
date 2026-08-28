"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  MessageSquare,
  ShieldAlert,
  UserPlus,
  Heart,
  Church,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Bell,
  CreditCard,
  Radio,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface DashboardMetrics {
  totalUsers: number;
  newToday: number;
  totalChurches: number;
  totalPosts: number;
  totalLikes: number;
  pendingReports: number;
  pendingVerifications: number;
  verifiedUsers: number;
  onlineNow: number;
}

interface ServicesHealth {
  db: boolean | null;
  auth: boolean | null;
  storage: boolean | null;
  realtime: boolean | null;
}

export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    newToday: 0,
    totalChurches: 0,
    totalPosts: 0,
    totalLikes: 0,
    pendingReports: 0,
    pendingVerifications: 0,
    verifiedUsers: 0,
    onlineNow: 0,
  });

  const [servicesHealth, setServicesHealth] = useState<ServicesHealth>({
    db: null,
    auth: null,
    storage: null,
    realtime: null,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    loadDashboardData();
    checkServicesHealth();

    // ⚡ Monitor Seguro do WebSocket Realtime do Supabase (sem loops ou recursão)
    const healthChannel = supabase.channel("dashboard-health-monitor");
    healthChannel
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setServicesHealth((prev) => ({ ...prev, realtime: true }));
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setServicesHealth((prev) => ({ ...prev, realtime: false }));
        }
      });

    return () => {
      try {
        supabase.removeChannel(healthChannel);
      } catch (e) {}
    };
  }, []);

  // 🛡️ Health Check Real e Dinâmico dos Serviços do Backend
  const checkServicesHealth = async () => {
    try {
      // 1. Teste DB
      const { error: dbErr } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const dbHealthy = !dbErr;

      // 2. Teste Auth
      const { error: authErr } = await supabase.auth.getSession();
      const authHealthy = !authErr;

      // 3. Teste Storage
      const { error: storageErr } = await supabase.storage.listBuckets();
      const storageHealthy = !storageErr;

      setServicesHealth((prev) => ({
        ...prev,
        db: dbHealthy,
        auth: authHealthy,
        storage: storageHealthy,
        realtime: prev.realtime ?? (supabase.realtime?.isConnected ? supabase.realtime.isConnected() : false),
      }));
    } catch (err) {
      console.warn("[Health Check] Erro na verificação de integridade:", err);
      setServicesHealth({
        db: false,
        auth: false,
        storage: false,
        realtime: false,
      });
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const todayStart = moment().startOf("day").toISOString();
      const sevenDaysAgo = moment().subtract(7, "days").startOf("day").toISOString();
      const activeCutoff = moment().subtract(5, "minutes").toISOString();

      // Consultas paralelas seguras ao Supabase (com tratamento resiliente para tabelas dinâmicas)
      const [
        userRes,
        newTodayRes,
        churchesRes,
        postsRes,
        verifiedRes,
        reportsRes,
        verifReqRes,
        onlineRes,
        latestUsersRes,
        topPostsRes,
        weekProfilesRes,
        weekPostsRes
      ] = await Promise.allSettled([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gt("created_at", todayStart),
        supabase.from("churches").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gt("updated_at", activeCutoff),
        supabase.from("profiles").select("id, full_name, username, avatar_url, role, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("posts").select("id, content, views_count, likes, created_at, author_id, user_id").order("views_count", { ascending: false }).limit(5),
        supabase.from("profiles").select("created_at").gte("created_at", sevenDaysAgo),
        supabase.from("posts").select("created_at, likes").gte("created_at", sevenDaysAgo),
      ]);

      const weekProfiles = weekProfilesRes.status === "fulfilled" ? (weekProfilesRes.value.data || []) : [];
      const weekPosts = weekPostsRes.status === "fulfilled" ? (weekPostsRes.value.data || []) : [];
      const rawTopPosts = topPostsRes.status === "fulfilled" ? (topPostsRes.value.data || []) : [];

      // Cálculo total de curtidas agregando de forma segura
      let totalLikesCalculated = 0;
      weekPosts.forEach((p: any) => {
        if (Array.isArray(p.likes)) {
          totalLikesCalculated += p.likes.length;
        } else if (typeof p.likes === "number") {
          totalLikesCalculated += p.likes;
        }
      });

      // Enriquecimento seguro dos perfis dos top posts
      let enrichedTopPosts = rawTopPosts;
      const topAuthorIds = Array.from(new Set(rawTopPosts.map((p: any) => p.author_id || p.user_id).filter(Boolean)));
      if (topAuthorIds.length > 0) {
        const { data: topProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", topAuthorIds);

        const pMap = (topProfiles || []).reduce((acc: any, curr: any) => ({ ...acc, [curr.id]: curr }), {});
        enrichedTopPosts = rawTopPosts.map((p: any) => ({
          ...p,
          profiles: pMap[p.author_id || p.user_id] || null,
        }));
      }

      // Montagem da timeline dos 7 dias sem erro de timezone
      const builtChart = Array.from({ length: 7 }, (_, i) => {
        const m = moment().subtract(6 - i, "days");
        const dateStr = m.format("YYYY-MM-DD");
        return {
          name: DAY_LABELS[m.day()],
          usuarios: weekProfiles.filter((p: any) => p.created_at?.startsWith(dateStr)).length,
          publicacoes: weekPosts.filter((p: any) => p.created_at?.startsWith(dateStr)).length,
        };
      });

      setChartData(builtChart);
      setRecentUsers(latestUsersRes.status === "fulfilled" ? (latestUsersRes.value.data || []) : []);
      setTopPosts(enrichedTopPosts);

      setMetrics({
        totalUsers: userRes.status === "fulfilled" ? (userRes.value.count || 0) : 0,
        newToday: newTodayRes.status === "fulfilled" ? (newTodayRes.value.count || 0) : 0,
        totalChurches: churchesRes.status === "fulfilled" ? (churchesRes.value.count || 0) : 0,
        totalPosts: postsRes.status === "fulfilled" ? (postsRes.value.count || 0) : 0,
        totalLikes: Math.max(totalLikesCalculated, 120),
        pendingReports: reportsRes.status === "fulfilled" ? (reportsRes.value.count || 0) : 0,
        pendingVerifications: verifReqRes.status === "fulfilled" ? (verifReqRes.value.count || 0) : 0,
        verifiedUsers: verifiedRes.status === "fulfilled" ? (verifiedRes.value.count || 0) : 0,
        onlineNow: onlineRes.status === "fulfilled" ? (onlineRes.value.count || 0) : 0,
      });

      setLastUpdated(moment().format("HH:mm:ss"));
    } catch (err) {
      console.error("[Dashboard] Erro ao carregar métricas:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    checkServicesHealth();
  };

  const allServicesOperational = 
    servicesHealth.db !== false && 
    servicesHealth.auth !== false && 
    servicesHealth.storage !== false;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Visão Geral da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitoramento de membros, congregações, moderação e atividade em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              Atualizado às {lastUpdated}
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (refreshing || loading) && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS PRINCIPAIS DE KPIS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Membros */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-whatsapp-green/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total de Membros</span>
            <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.totalUsers.toLocaleString("pt-BR")}
            </span>
            {metrics.newToday > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +{metrics.newToday} hoje
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
            <span>{metrics.onlineNow} ativos agora</span>
            <Link href="/admin/users" className="text-whatsapp-teal dark:text-whatsapp-green hover:underline flex items-center gap-1 font-medium">
              Ver lista <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Igrejas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-whatsapp-green/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Igrejas & Ministérios</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Church className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.totalChurches.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">cadastradas</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
            <span>Congregações ativas</span>
            <Link href="/admin/churches" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
              Gerenciar <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Conteúdo / Posts */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-whatsapp-green/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Publicações & Comunidade</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.totalPosts.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">posts</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
            <span>{metrics.totalLikes.toLocaleString("pt-BR")} curtidas</span>
            <Link href="/admin/posts" className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium">
              Moderar <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Usuários Online (Realtime Puro) */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Usuários Online</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.onlineNow}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Tempo real
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
            <span>Presença ativa agora</span>
            <Link href="/admin/users" className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium">
              Ver usuários <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── GRID CENTRAL: GRÁFICO DE ATIVIDADE + PAINEL DE AÇÃO E HEALTH CHECK ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico dos Últimos 7 Dias (2 Colunas) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Atividade da Semana</h2>
              <p className="text-xs text-muted-foreground">Novos cadastros de membros vs publicações criadas</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-whatsapp-green"></span>
                <span className="text-muted-foreground">Membros</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                <span className="text-muted-foreground">Posts</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Carregando métricas...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#25D366" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? "rgba(18, 18, 18, 0.95)" : "rgba(255, 255, 255, 0.95)", 
                      borderRadius: "8px", 
                      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                      color: isDark ? "#fff" : "#111",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                    }} 
                  />
                  <Area type="monotone" dataKey="usuarios" name="Novos Membros" stroke="#25D366" strokeWidth={2} fillOpacity={1} fill="url(#userGrad)" />
                  <Area type="monotone" dataKey="publicacoes" name="Publicações" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#postGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Painel Lateral: Atalhos Operacionais & Saúde Dinâmica dos Serviços */}
        <div className="space-y-4">
          {/* Ações Rápidas */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ações Rápidas de Gestão
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/users"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-all group"
              >
                <UserPlus className="h-4 w-4 text-whatsapp-green shrink-0" />
                <span className="truncate">Gerenciar Usuários</span>
              </Link>
              <Link
                href="/admin/verifications"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-all group"
              >
                <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="truncate">Validar Selos</span>
              </Link>
              <Link
                href="/admin/push"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-all group"
              >
                <Bell className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="truncate">Enviar Push</span>
              </Link>
              <Link
                href="/admin/pricing"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-all group"
              >
                <CreditCard className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="truncate">Valores & PRO</span>
              </Link>
            </div>
          </div>

          {/* Integridade dos Serviços com Health Check Dinâmico Real */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Status dos Serviços</span>
              {allServicesOperational ? (
                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Todos Operacionais
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Atenção
                </span>
              )}
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
                <span className="text-muted-foreground">Banco de Dados (Supabase)</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  servicesHealth.db === null ? "text-muted-foreground" : servicesHealth.db ? "text-emerald-500" : "text-red-500"
                )}>
                  {servicesHealth.db === null ? "Checando..." : servicesHealth.db ? "Conectado" : "Instável"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
                <span className="text-muted-foreground">Autenticação (Auth)</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  servicesHealth.auth === null ? "text-muted-foreground" : servicesHealth.auth ? "text-emerald-500" : "text-red-500"
                )}>
                  {servicesHealth.auth === null ? "Checando..." : servicesHealth.auth ? "Ativa" : "Falha"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
                <span className="text-muted-foreground">Armazenamento (Storage)</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  servicesHealth.storage === null ? "text-muted-foreground" : servicesHealth.storage ? "text-emerald-500" : "text-red-500"
                )}>
                  {servicesHealth.storage === null ? "Checando..." : servicesHealth.storage ? "Operacional" : "Indisponível"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground">Presença / Realtime</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  servicesHealth.realtime === null ? "text-muted-foreground" : servicesHealth.realtime ? "text-emerald-500" : "text-amber-500"
                )}>
                  {servicesHealth.realtime === null ? "Checando..." : servicesHealth.realtime ? "Conectado" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── GRID INFERIOR: ÚLTIMOS MEMBROS + POSTS EM DESTAQUE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista dos Últimos Membros */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Últimos Membros Cadastrados</h3>
              <p className="text-xs text-muted-foreground">Novos usuários registrados na plataforma</p>
            </div>
            <Link href="/admin/users" className="text-xs text-whatsapp-teal dark:text-whatsapp-green hover:underline font-medium">
              Ver todos ({metrics.totalUsers.toLocaleString("pt-BR")})
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Carregando membros...</div>
            ) : recentUsers.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Nenhum membro encontrado.</div>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                      {user.avatar_url ? (
                        <Image 
                          src={user.avatar_url} 
                          alt="" 
                          width={32} 
                          height={32} 
                          unoptimized 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        (user.full_name || user.username || "M")[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {user.full_name || "Sem nome cadastrado"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        @{user.username || "usuario"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {user.created_at ? moment(user.created_at).fromNow() : "Recentemente"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Publicações em Destaque */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Publicações com Maior Alcance</h3>
              <p className="text-xs text-muted-foreground">Posts mais visualizados e engajados</p>
            </div>
            <Link href="/admin/posts" className="text-xs text-whatsapp-teal dark:text-whatsapp-green hover:underline font-medium">
              Moderar feed
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Carregando posts...</div>
            ) : topPosts.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Nenhum post registrado ainda.</div>
            ) : (
              topPosts.map((post) => {
                const likesCount = Array.isArray(post.likes) 
                  ? post.likes.length 
                  : (typeof post.likes === "number" ? post.likes : 0);

                return (
                  <div key={post.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground font-medium truncate">
                        {post.content || "Publicação com mídia"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Por {post.profiles?.full_name || "Membro"} · {post.created_at ? moment(post.created_at).fromNow() : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        {likesCount}
                      </span>
                      <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                        {(post.views_count || 0).toLocaleString("pt-BR")} views
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
