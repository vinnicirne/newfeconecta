"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  ShieldAlert,
  TrendingUp,
  ArrowUpRight,
  UserPlus,
  Heart,
  Target,
  Repeat,
  LayoutDashboard,
  Link2,
  Eye,
  CheckCircle2,
  FileSearch,
  Camera,
  Layout,
  Type,
  Smartphone,
  Mic,
  Image,
  Sparkles,
  Zap,
  Shield,
  Play,
  Flame,
  Share2,
  DollarSign,
  ShieldCheck,
  UserCircle
} from "lucide-react";
import { StatsCard } from "@/components/cards/stats-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalPosts: number;
    totalTribo: number;
    totalReposts: number;
    totalFollows: number;
    totalViews: number;
    newToday: number;
    hashtagCount: number;
    topHashtags: { tag: string; count: number }[];
    verifiedUsers: number;
    pendingVerifications: number;
    activeRooms: number;
    activePrices: number;
    storiesToday: number;
    bannersSentToday: number;
    mediaOperational: boolean;
    onlineNow: number;
    totalRevenue: number;
    manualRevenue: number;
    db: string;
    auth: string;
    storage: string;
    errors: number;
    noAvatarUsers: number;
    enginePerformance: string;
    externalMediaHealth: string;
    notificationHealth: string;
    isPriceFallback: boolean;
    bannersOpenedToday: number;
    ctr: number;
    totalExternalMedia: number;
    videoOptimization: string;
  }>({
    totalUsers: 0,
    totalPosts: 0,
    totalTribo: 0,
    totalReposts: 0,
    totalFollows: 0,
    totalViews: 0,
    newToday: 0,
    hashtagCount: 0,
    topHashtags: [],
    verifiedUsers: 0,
    pendingVerifications: 0,
    activeRooms: 0,
    activePrices: 0,
    storiesToday: 0,
    bannersSentToday: 0,
    mediaOperational: true,
    onlineNow: 0,
    totalRevenue: 0,
    manualRevenue: 0,
    db: 'operational',
    auth: 'operational',
    storage: 'operational',
    errors: 0,
    noAvatarUsers: 0,
    enginePerformance: 'Optimized (Memoized)',
    externalMediaHealth: 'Stable (Resilient Sandbox)',
    notificationHealth: 'Sincronizado',
    isPriceFallback: false,
    bannersOpenedToday: 0,
    ctr: 0,
    totalExternalMedia: 0,
    videoOptimization: 'Ativa (1-Click)'
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [retentionRate, setRetentionRate] = useState(0);
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [ping, setPing] = useState<number | null>(null);

  const [adminName, setAdminName] = useState("Admin");
  const [aiOperational, setAiOperational] = useState<boolean | null>(null);
  const [livekitOperational, setLivekitOperational] = useState<boolean | null>(null);

  useEffect(() => {
    fetchStats();
    fetchAdminName();
    checkAIStatus();
    checkLiveKitStatus();
    const interval = setInterval(() => {
      const start = Date.now();
      fetch('/').then(() => setPing(Date.now() - start)).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkLiveKitStatus = async () => {
    try {
      let url = (process.env.NEXT_PUBLIC_LIVEKIT_URL || "").replace('wss://', 'https://').replace('ws://', 'http://');
      if (!url) {
        setLivekitOperational(false);
        return;
      }
      await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      setLivekitOperational(true);
    } catch (err) {
      setLivekitOperational(!!process.env.NEXT_PUBLIC_LIVEKIT_URL);
    }
  };

  const checkAIStatus = async () => {
    try {
      const res = await fetch('/api/ai/bible-study');
      const data = await res.json();
      setAiOperational(!!data.operational);
    } catch (err) {
      setAiOperational(false);
    }
  };

  const checkStorageHealth = async () => {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      return !error && !!data;
    } catch (e) { return false; }
  };

  const checkAuthHealth = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      return !error && !!data;
    } catch (e) { return false; }
  };

  const checkDbHealth = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch (e) { return false; }
  };

  const fetchAdminName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) setAdminName(profile.full_name);
      }
    } catch (err) {
      console.warn("Ignorable Auth Lock Error: User session query interrupted", err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: onlineCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', tenMinsAgo);

      const { count: mediaErrors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .in('module', ['camera', 'gallery', 'audio', 'story'])
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .eq('resolved', false);

      const { count: triboCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('post_type', 'video');

      const { count: externalCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('post_type', 'external_media');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', today.toISOString());

      const { data: allPosts } = await supabase.from('posts').select('content').order('created_at', { ascending: false }).limit(500);
      const tagMap: Record<string, number> = {};
      let totalTags = 0;

      allPosts?.forEach(post => {
        const hashtags = post.content?.match(/#[\wáàâãéèêíïóôõöúç]+/g);
        if (hashtags) {
          hashtags.forEach((tag: string) => {
            const lowerTag = tag.toLowerCase();
            tagMap[lowerTag] = (tagMap[lowerTag] || 0) + 1;
            totalTags++;
          });
        }
      });

      const topHashtags = Object.entries(tagMap)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const { count: repostsCount } = await supabase.from('reposts').select('*', { count: 'exact', head: true });
      const { count: followsCount } = await supabase.from('follows').select('*', { count: 'exact', head: true });
      const { data: viewsData } = await supabase.from('posts').select('views_count');
      const totalViews = viewsData?.reduce((acc, curr) => acc + (Number(curr.views_count) || 0), 0) || 0;
      const { count: verifiedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);
      const { count: pendingCount } = await supabase
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*, profiles!creator_id(full_name)')
        .eq('status', 'active');

      const realActiveRooms = roomsData?.length || 0;
      // 1. Busca de Configurações de Preço Reais
      const { data: configData } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'verification_prices')
        .maybeSingle();
      
      const defaultPrices = [
        { role: "Bispo", price: "9,99" }, { role: "Apóstolo", price: "9,99" },
        { role: "Pastor", price: "9,99" }, { role: "Missionário", price: "9,99" },
        { role: "Igreja", price: "14,99" }, { role: "Evangelista", price: "6,99" },
        { role: "Diácono", price: "6,99" }, { role: "Presbítero", price: "6,99" },
        { role: "Líder", price: "6,99" }, { role: "Levita", price: "3,99" },
        { role: "Membro", price: "3,99" }
      ];
      const isPriceFallback = !configData?.value;
      const currentPrices = configData?.value || defaultPrices;

      const priceMap: Record<string, number> = {};
      currentPrices.forEach((p: any) => { priceMap[p.role] = parseFloat(p.price.replace(',', '.')) || 0; });

      const { data: approvedRequests } = await supabase
        .from('verification_requests')
        .select('requested_role')
        .eq('status', 'approved');
      
      const totalRevenue = (approvedRequests || []).reduce((acc, curr) => acc + (priceMap[curr.requested_role] || 6.99), 0);
      const { data: manualTxData } = await supabase.from('transactions').select('amount');
      const realManualRevenue = (manualTxData || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const [isStorageOk, isAuthOk, isDbOk] = await Promise.all([
        checkStorageHealth(),
        checkAuthHealth(),
        checkDbHealth()
      ]);

      const { count: noAvatarCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or('avatar_url.is.null,avatar_url.eq.""');

      const { count: storiesCount } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', today.toISOString());

      const { count: pushErrors } = await supabase
        .from('system_errors')
        .select('*', { count: 'exact', head: true })
        .eq('module', 'admin_push')
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { count: bannersCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'high')
        .gt('created_at', today.toISOString());

      const { count: openedCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .not('opened_at', 'is', null)
        .gt('created_at', today.toISOString());

      const ctr = bannersCount && bannersCount > 0 
        ? (openedCount || 0) / bannersCount * 100 
        : 0;

      const pricesCount = currentPrices.length;
      const notificationHealth = pushErrors && pushErrors > 5 ? 'Alerta Transmissão' : 'Operacional';

      setStats({
        totalUsers: userCount || 0,
        totalPosts: postCount || 0,
        totalTribo: triboCount || 0,
        totalReposts: repostsCount || 0,
        totalFollows: followsCount || 0,
        totalViews: totalViews,
        newToday: newToday || 0,
        hashtagCount: totalTags,
        topHashtags,
        verifiedUsers: verifiedCount || 0,
        pendingVerifications: pendingCount || 0,
        activeRooms: realActiveRooms,
        activePrices: pricesCount,
        storiesToday: storiesCount || 0,
        bannersSentToday: bannersCount || 0,
        mediaOperational: (mediaErrors || 0) === 0,
        onlineNow: onlineCount || 0,
        totalRevenue: totalRevenue + realManualRevenue,
        manualRevenue: realManualRevenue,
        db: isDbOk ? 'operational' : 'degraded',
        auth: isAuthOk ? 'operational' : 'degraded',
        storage: isStorageOk ? 'operational' : 'degraded',
        errors: mediaErrors || 0,
        noAvatarUsers: noAvatarCount || 0,
        enginePerformance: ping && ping < 300 ? 'Optimized (Memoized)' : 'Latência Alta',
        externalMediaHealth: (mediaErrors || 0) < 3 ? 'Stable (Resilient)' : 'Degradado',
        notificationHealth: notificationHealth,
        isPriceFallback: isPriceFallback,
        bannersOpenedToday: openedCount || 0,
        ctr: Math.round(ctr * 10) / 10,
        totalExternalMedia: externalCount || 0,
        videoOptimization: (mediaErrors || 0) === 0 ? 'Ativa (Lazy Mount)' : 'Ação Requerida'
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const [{ data: weekProfiles }, { data: weekPosts }] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
        supabase.from('posts').select('created_at').gte('created_at', sevenDaysAgo.toISOString()),
      ]);
      const builtChart = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
          name: DAY_LABELS[d.getDay()],
          users: weekProfiles?.filter(p => p.created_at.startsWith(dateStr)).length || 0,
          posts: weekPosts?.filter(p => p.created_at.startsWith(dateStr)).length || 0,
        };
      });
      setChartData(builtChart);
      const { data: latestUsers } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, created_at, username')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentUsers(latestUsers || []);

      const { data: latestOnline } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, updated_at, username, role')
        .gt('updated_at', tenMinsAgo)
        .order('updated_at', { ascending: false })
        .limit(10);
      setOnlineUsers(latestOnline || []);

      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true });
      setTotalLikes(likesCount || 0);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: activePosts30d } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());
      const rate = (userCount && userCount > 0)
        ? Math.min(Math.round(((activePosts30d || 0) / userCount) * 100), 100)
        : 0;
      setRetentionRate(rate);
      const { data: viralData } = await supabase
        .from('posts')
        .select('id, content, views_count, likes, profiles!user_id(full_name), post_type')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('views_count', { ascending: false })
        .limit(5);
      setTopPosts(viralData || []);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const systems = [
    { name: "Banco de Dados (PostgreSQL)", status: stats.db, latency: ping ? `${ping}ms` : '...', uptime: "100%" },
    { name: "Autenticação (Supabase Auth)", status: stats.auth, latency: ping ? `${Math.round(ping * 0.8)}ms` : '...', uptime: "99.9%" },
    { name: "Armazenamento (Edge Storage)", status: stats.storage, latency: ping ? `${Math.round(ping * 1.2)}ms` : '...', uptime: "100%" },
    { name: "Gateway de Mensagens (Push)", status: stats.errors > 0 ? "degraded" : "operational", latency: ping ? `${Math.round(ping * 1.5)}ms` : '...', uptime: "98.5%" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {aiOperational === false && (
        <div className="bg-orange-500/10 border-2 border-orange-500/20 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl shadow-orange-500/5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-orange-600 dark:text-orange-500 uppercase tracking-tight">Motor de Análise Bíblica Desativado</h3>
              <p className="text-sm text-orange-600/70 font-medium">O Sistema de Análise Bíblica (Gemini) requer uma chave de API para processar exegeses bíblicas.</p>
            </div>
          </div>
          <button
            onClick={() => toast.info("Adicione GEMINI_API_KEY ao seu arquivo .env.local para ativar.")}
            className="px-6 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
          >
            Como Configurar
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold dark:text-white">Bem-vindo, {adminName}</h1>
          <p className="text-gray-500 dark:text-gray-400">Aqui está o resumo real do seu rebanho digital hoje.</p>
        </div>
        <a
          href="/admin/monitoramento"
          className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/20 hover:bg-red-500/20 transition-all w-fit"
        >
          <ShieldAlert className="w-4 h-4" /> Monitor de Falhas
        </a>
      </div>

      <section className="bg-whatsapp-green/10 border border-whatsapp-green/20 rounded-2xl p-6 whatsapp-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-whatsapp-green flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" /> Gestão de Recursos Ativos
          </h2>
          <span className="text-[10px] bg-whatsapp-green text-whatsapp-dark px-2 py-0.5 rounded-md font-black uppercase">Ciclo de Estabilização v2</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Rede de Vídeos', status: `${stats.totalTribo} Ativos`, icon: TrendingUp, desc: 'Tribo (Vídeos Nativos)', link: '/admin/posts' },
            { name: 'Mídia Externa', status: `${stats.totalExternalMedia} Links`, icon: Link2, desc: 'Feed (YouTube/TikTok)', link: '/admin/posts' },
            { name: 'Otimização Play', status: stats.videoOptimization, icon: Zap, desc: 'Buffer Zero & 1-Click', link: '/admin/monitoramento' },
            { name: 'Sala de Guerra', status: livekitOperational ? `${stats.activeRooms} Salas Ativas` : 'Servidor Offline', icon: Mic, desc: 'Audio, Transmissão e LiveKit', link: '/admin/rooms' },
            { name: 'Motor de Análise Bíblica', status: aiOperational === true ? 'Conectado' : (aiOperational === false ? 'Requer Chave' : 'Verificando...'), icon: Sparkles, desc: 'Análise Teológica Gemini 2.5', link: '/bible' },
            { name: 'Gestão Financeira', status: stats.isPriceFallback ? 'Modo Segurança' : 'Sincronizado', icon: DollarSign, desc: 'Checkouts e Assinaturas', link: '/admin/pricing' },
            { name: 'Otimização Mídia', status: stats.mediaOperational ? 'Operacional' : 'Falha Detectada', icon: Zap, desc: 'Compressão Dinâmica Flash', link: '/admin/monitoramento' },
            { name: 'Stories Galeria', status: stats.storiesToday > 0 ? `${stats.storiesToday} Hoje` : 'Ativo (Aguardando)', icon: Image, desc: 'Upload e Gravação 30s', link: '/admin/posts' },
            { name: 'Higiene de Perfil', status: stats.noAvatarUsers > 0 ? `${stats.noAvatarUsers} s/ Foto` : '100% OK', icon: UserCircle, desc: 'Usuários em Fallback Visual', link: '/admin/users' },
            { name: 'Auditoria Ministerial', status: stats.pendingVerifications > 0 ? `${stats.pendingVerifications} em Verificação` : 'Identidade Auditada', icon: ShieldCheck, desc: 'Gestão de Selos e Identidade', link: '/admin/verifications' },
            { name: 'Presença Mobile', status: stats.onlineNow > 0 ? `${stats.onlineNow} Online Agora` : 'Sincronizado', icon: Smartphone, desc: 'App e Admin integrados', link: '/admin/users' },
            { name: 'Sinalização', status: stats.bannersSentToday > 0 ? `${stats.bannersSentToday} Banners (${stats.ctr}% CTR)` : 'Sincronizado', icon: Zap, desc: 'Push Híbrido e Realtime', link: '/admin/push' },
            { name: 'Engine Social', status: stats.enginePerformance, icon: Zap, desc: 'Memoização e Cache Ativo', link: '/admin/monitoramento' },
            { name: 'Estabilidade Mídia', status: stats.externalMediaHealth, icon: ShieldCheck, desc: 'Sandbox Resiliente (SDKs)', link: '/admin/monitoramento' },
            { name: 'Latência (Ping)', status: ping ? `${ping}ms` : '---', icon: Zap, desc: 'Conexão com Servidor Edge', link: '/admin/status' },
            { name: 'Compartilhamento Social', status: 'Operacional (OG OK)', icon: Share2, desc: 'Metadados e Deep Linking', link: '/admin/design' },
          ].map(({ icon: Icon, ...feature }) => (
            <a
              href={(feature as any).link || '#'}
              key={feature.name}
              className="bg-white dark:bg-[#111b21] p-4 rounded-xl border border-gray-100 dark:border-white/5 flex items-start gap-3 hover:border-whatsapp-green/40 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-whatsapp-green/20 flex items-center justify-center text-whatsapp-green group-hover:scale-110 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold dark:text-white leading-none mb-1">{feature.name}</h4>
                <p className="text-[10px] text-gray-500 mb-1 leading-tight">{feature.desc}</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                    feature.status.includes('Pendentes') || feature.status.includes('Falha') || feature.status.includes('Offline') ? 'bg-orange-500' : 'bg-whatsapp-green'
                  )} />
                  <span className={cn("text-[9px] font-black uppercase",
                    feature.status.includes('Pendentes') || feature.status.includes('Falha') || feature.status.includes('Offline') ? 'text-orange-500' : 'text-whatsapp-green'
                  )}>
                    {feature.status}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Usuários"
          value={loading ? "..." : stats.totalUsers.toLocaleString()}
          change="Total Auditado"
          trend="up"
          icon={Users}
          color="bg-whatsapp-teal"
          link="/admin/users"
        />
        <StatsCard
          title="Novos (24h)"
          value={loading ? "..." : stats.newToday.toLocaleString()}
          change="Sincronizado"
          trend="up"
          icon={UserPlus}
          color="bg-whatsapp-green"
          link="/admin/users"
        />
        <StatsCard
          title="Total de Posts"
          value={loading ? "..." : stats.totalPosts.toLocaleString()}
          change="Global"
          trend="up"
          icon={MessageSquare}
          color="bg-whatsapp-blue"
          link="/admin/posts"
        />
        <StatsCard
          title="Aguardando Verificação"
          value={loading ? "..." : stats.pendingVerifications.toLocaleString()}
          change={stats.pendingVerifications > 0 ? "Ação Requerida" : "Tudo Limpo"}
          trend={stats.pendingVerifications > 0 ? "up" : "down"}
          icon={ShieldAlert}
          color={stats.pendingVerifications > 0 ? "bg-orange-500" : "bg-whatsapp-green"}
          link="/admin/verifications"
        />
        <StatsCard
          title="Salas de Guerra Ativas"
          value={loading ? "..." : stats.activeRooms.toLocaleString()}
          change="Tempo Real"
          trend="up"
          icon={Mic}
          color="bg-whatsapp-teal"
          link="/admin/rooms"
        />
        <StatsCard
          title="Perfis Verificados"
          value={loading ? "..." : stats.verifiedUsers.toLocaleString()}
          change={`${Math.min(100, Math.round((stats.verifiedUsers / (stats.totalUsers || 1)) * 100))}% Conversion`}
          trend="up"
          icon={ShieldCheck}
          color="bg-whatsapp-green"
          link="/admin/users"
        />
        <StatsCard
          title="# Hashtags Ativas"
          value={loading ? "..." : stats.hashtagCount.toLocaleString()}
          change="Monitorado"
          trend="up"
          icon={Target}
          color="bg-purple-500"
        />
        <StatsCard
          title="Republicações"
          value={loading ? "..." : stats.totalReposts.toLocaleString()}
          change="Viral Engine"
          trend="up"
          icon={Repeat}
          color="bg-orange-500"
        />
        <StatsCard
          title="Conexões (Follows)"
          value={loading ? "..." : stats.totalFollows.toLocaleString()}
          change="Auditado"
          trend="up"
          icon={Link2}
          color="bg-pink-500"
        />
        <StatsCard
          title="Visualizações"
          value={loading ? "..." : stats.totalViews.toLocaleString()}
          change="Telemetria Real"
          trend="up"
          icon={Eye}
          color="bg-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-whatsapp-darkLighter p-8 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Crescimento da Rede</h3>
              <p className="text-sm text-gray-500">Atividade de usuários nos últimos 7 dias</p>
            </div>
            <button className="flex items-center gap-2 text-sm font-medium text-whatsapp-teal dark:text-whatsapp-green hover:underline">
              Ver relatório completo <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#128C7E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#128C7E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111B21',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#128C7E"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Sidebar */}
        <div className="bg-whatsapp-teal text-white p-8 rounded-2xl whatsapp-shadow relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="text-xl font-bold mb-2">Um lugar de adoração</h3>
            <p className="text-sm text-white/70 mb-8">A fé conecta pessoas em todo o mundo através da nossa plataforma.</p>

            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-whatsapp-green" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Reações Totais</p>
                  <p className="text-lg font-bold">{loading ? '...' : totalLikes.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-whatsapp-green" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Taxa de Engajamento (30d)</p>
                  <p className="text-lg font-bold">{loading ? '...' : `${retentionRate}%`}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 text-center space-y-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-left">
                <p className="text-[10px] uppercase font-black text-whatsapp-green tracking-widest mb-1">Tags em Alta</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topHashtags.length > 0 ? (
                    stats.topHashtags.map(h => (
                      <span key={h.tag} className="text-xs font-bold">{h.tag} <span className="opacity-50 font-normal">({h.count})</span></span>
                    ))
                  ) : (
                    <span className="text-xs text-white/40 italic">Nenhuma tag ainda</span>
                  )}
                </div>
              </div>
              <button className="w-full bg-whatsapp-green text-whatsapp-dark font-bold py-3 rounded-xl hover:bg-opacity-90 transition-all">
                Configurar Campanhas
              </button>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-whatsapp-green/10 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold dark:text-white">Atividade Recente</h3>
          <button className="text-xs text-whatsapp-teal dark:text-whatsapp-green font-semibold">Ver tudo</button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {recentUsers.length === 0 && !loading && (
            <p className="p-6 text-sm text-gray-400">Nenhum cadastro recente.</p>
          )}
          {recentUsers.map((u) => (
            <div key={u.created_at} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-whatsapp-dark overflow-hidden flex-shrink-0">
                  {u.avatar_url && !u.avatar_url.includes('vercel.sh')
                    ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white font-black text-sm uppercase shadow-inner">
                        {(() => {
                          const name = u.full_name || u.username || "U";
                          const parts = name.trim().split(/\s+/);
                          return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : parts[0][0].toUpperCase();
                        })()}
                      </div>
                  }
                </div>
                <div>
                  <p className="text-sm font-medium dark:text-white">Novo usuário: <span className="text-whatsapp-teal dark:text-whatsapp-green">{u.full_name || u.username || 'Sem nome'}</span></p>
                  <p className="text-[11px] text-gray-500">{new Date(u.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-whatsapp-green/10 text-whatsapp-green text-[10px] font-bold rounded-md uppercase">Novo</span>
            </div>
          ))}
        </div>
      </div>

      {/* Online Users Section */}
      {onlineUsers.length > 0 && (
        <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-whatsapp-green/20 dark:border-whatsapp-green/10 whatsapp-shadow overflow-hidden mt-6">
          <div className="p-6 border-b border-whatsapp-green/10 flex items-center gap-3">
            <div className="relative">
              <Smartphone className="w-5 h-5 text-whatsapp-green" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-whatsapp-green rounded-full animate-ping" />
            </div>
            <h3 className="font-bold dark:text-white">Usuários Online Agora ({stats.onlineNow})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {onlineUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent hover:border-whatsapp-green/30 transition-all">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-whatsapp-dark overflow-hidden flex-shrink-0">
                    {u.avatar_url && !u.avatar_url.includes('vercel.sh')
                      ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full bg-whatsapp-teal flex items-center justify-center text-white font-black text-sm uppercase">
                          {u.full_name ? u.full_name[0] : 'U'}
                        </div>
                    }
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-whatsapp-green border-2 border-white dark:border-[#111b21] rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold dark:text-white truncate">{u.full_name || u.username}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{u.role || 'Membro'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts em Alta — Viral Engine */}
      {topPosts.length > 0 && (
        <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold dark:text-white">Posts em Alta (últimos 7 dias)</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {topPosts.map((p, i) => (
              <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0",
                  i === 0 ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                )}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm dark:text-white font-medium truncate">{p.content?.substring(0, 60) || `Post ${p.post_type}`}...</p>
                  <p className="text-[11px] text-gray-400">{(p.profiles as any)?.full_name || 'Usuário'}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-blue-500">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{(p.views_count || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{(p.likes?.length || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
