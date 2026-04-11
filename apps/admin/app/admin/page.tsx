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
  LayoutDashboard
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

const data = [
  { name: "Seg", users: 400, posts: 240 },
  { name: "Ter", users: 300, posts: 139 },
  { name: "Qua", users: 200, posts: 980 },
  { name: "Qui", users: 278, posts: 390 },
  { name: "Sex", users: 189, posts: 480 },
  { name: "Sáb", users: 239, posts: 380 },
  { name: "Dom", users: 349, posts: 430 },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalLumes: 0,
    totalReposts: 0,
    newToday: 0,
    hashtagCount: 0,
    topHashtags: [] as { tag: string, count: number }[]
  });
  const [loading, setLoading] = useState(true);

  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    fetchStats();
    fetchAdminName();
  }, []);

  const fetchAdminName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) setAdminName(profile.full_name);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Total de Usuários reais do banco
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      // Total de Posts reais
      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      
      // Filtro para Lumes (Vídeos)
      const { count: lumesCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('post_type', 'video');

      // Novos perfis registrados hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: newToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', today.toISOString());

      // Processamento em tempo real das Hashtags
      const { data: allPosts } = await supabase.from('posts').select('content');
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

      // Total de Republicações (Reposts)
      const { count: repostsCount } = await supabase.from('reposts').select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: userCount || 0,
        totalPosts: postCount || 0,
        totalLumes: lumesCount || 0,
        totalReposts: repostsCount || 0,
        newToday: newToday || 0,
        hashtagCount: totalTags,
        topHashtags
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold dark:text-white">Bem-vindo, {adminName}</h1>
        <p className="text-gray-500 dark:text-gray-400">Aqui está o resumo real do seu rebanho digital hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total de Usuários" 
          value={loading ? "..." : stats.totalUsers.toLocaleString()} 
          change="+12%" 
          trend="up" 
          icon={Users} 
          color="bg-whatsapp-teal" 
        />
        <StatsCard 
          title="Novos (24h)" 
          value={loading ? "..." : stats.newToday.toLocaleString()} 
          change="+5%" 
          trend="up" 
          icon={UserPlus} 
          color="bg-whatsapp-green" 
        />
        <StatsCard 
          title="Total de Posts" 
          value={loading ? "..." : stats.totalPosts.toLocaleString()} 
          change={stats.totalPosts > 0 ? "+1.2%" : "0%"} 
          trend="up" 
          icon={MessageSquare} 
          color="bg-whatsapp-blue" 
        />
        <StatsCard 
          title="Total de Lumes" 
          value={loading ? "..." : stats.totalLumes.toLocaleString()} 
          change="Novo" 
          trend="up" 
          icon={TrendingUp} 
          color="bg-whatsapp-tealLight" 
        />
        <StatsCard 
          title="# Hashtags Ativas" 
          value={loading ? "..." : stats.hashtagCount.toLocaleString()} 
          change={stats.hashtagCount > 0 ? "Real-time" : "Aguardando"} 
          trend="up" 
          icon={Target} 
          color="bg-purple-500" 
        />
        <StatsCard 
          title="Republicações" 
          value={loading ? "..." : stats.totalReposts.toLocaleString()} 
          change="+8%" 
          trend="up" 
          icon={Repeat} 
          color="bg-orange-500" 
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
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#128C7E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#128C7E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
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
                  <p className="text-lg font-bold">1.2M</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-whatsapp-green" />
                </div>
                <div>
                  <p className="text-xs text-white/50">Taxa de Retenção</p>
                  <p className="text-lg font-bold">68%</p>
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-whatsapp-dark" />
                <div>
                  <p className="text-sm font-medium dark:text-white">Novo usuário registrado: <span className="text-whatsapp-teal dark:text-whatsapp-green">João Silva</span></p>
                  <p className="text-[11px] text-gray-500">Há 5 minutos • São Paulo, BR</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-whatsapp-green/10 text-whatsapp-green text-[10px] font-bold rounded-md uppercase">Novo</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
