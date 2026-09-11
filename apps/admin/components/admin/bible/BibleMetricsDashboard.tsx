"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, Users, MessageSquare, Heart, Highlighter, Activity, Trophy, Clock, Search, Book } from "lucide-react";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";

export default function BibleMetricsDashboard() {
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState("");

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch interactions limits to recent 5000 to avoid browser memory crash, can be paginated later
      const { data, error } = await supabase
        .from("bible_interactions")
        .select(`
          id, user_id, book_abbrev, chapter, verse_number, comment, is_favorite, highlight_color, created_at,
          profiles:user_id(full_name, avatar_url, username)
        `)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      setInteractions(data || []);
    } catch (err) {
      console.error("[BibleMetrics] Erro ao buscar métricas:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- AGGREGATIONS ---
  const metrics = useMemo(() => {
    let totalReads = 0;
    let totalComments = 0;
    let totalFavorites = 0;
    let totalHighlights = 0;

    const bookEngagements: Record<string, number> = {};
    const verseComments: Record<string, { count: number; book: string; chapter: number; verse: number }> = {};
    const userRanking: Record<string, { user: any; reads: number; interactions: number; lastActive: string }> = {};

    interactions.forEach((item) => {
      // Global Totals
      const isRead = item.verse_number === 0 && item.comment === 'CHAPTER_READ';
      if (isRead) totalReads++;
      if (item.comment && !isRead) totalComments++;
      if (item.is_favorite) totalFavorites++;
      if (item.highlight_color) totalHighlights++;

      // User Ranking
      if (!userRanking[item.user_id] && item.profiles) {
        userRanking[item.user_id] = {
          user: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
          reads: 0,
          interactions: 0,
          lastActive: item.created_at
        };
      }
      
      if (userRanking[item.user_id]) {
        if (isRead) userRanking[item.user_id].reads++;
        else userRanking[item.user_id].interactions++;
        
        if (new Date(item.created_at) > new Date(userRanking[item.user_id].lastActive)) {
          userRanking[item.user_id].lastActive = item.created_at;
        }
      }

      // Book Popularity (Reads + Engagements)
      if (!bookEngagements[item.book_abbrev]) bookEngagements[item.book_abbrev] = 0;
      bookEngagements[item.book_abbrev]++;

      // Verse Comments Ranking
      if (item.verse_number > 0 && item.comment) {
        const verseKey = `${item.book_abbrev} ${item.chapter}:${item.verse_number}`;
        if (!verseComments[verseKey]) {
          verseComments[verseKey] = { count: 0, book: item.book_abbrev, chapter: item.chapter, verse: item.verse_number };
        }
        verseComments[verseKey].count++;
      }
    });

    const topBooks = Object.entries(bookEngagements)
      .map(([abbrev, count]) => {
        const bookObj = BIBLE_BOOKS.find(b => b.abbrev === abbrev);
        return { abbrev, name: bookObj ? bookObj.name : abbrev, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topVerses = Object.entries(verseComments)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = Object.values(userRanking)
      .sort((a, b) => (b.reads + b.interactions) - (a.reads + a.interactions));

    return {
      totalReads,
      totalComments,
      totalFavorites,
      totalHighlights,
      topBooks,
      topVerses,
      topUsers
    };
  }, [interactions]);

  const filteredUsers = metrics.topUsers.filter(u => 
    u.user?.full_name?.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.user?.username?.toLowerCase().includes(searchUser.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-whatsapp-teal">
        <Activity className="w-8 h-8 animate-spin mb-4" />
        <p className="font-bold text-sm">Processando métricas da comunidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Cards de Totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{metrics.totalReads}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capítulos Lidos</p>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{metrics.totalComments}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comentários</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{metrics.totalFavorites}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Favoritos</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Highlighter className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{metrics.totalHighlights}</p>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grifos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Livros Mais Lidos / Interagidos */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> 
            Top Livros (Engajamento)
          </h3>
          <div className="space-y-4">
            {metrics.topBooks.map((book, idx) => (
              <div key={book.abbrev} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-black text-gray-500">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-sm text-foreground">{book.name}</span>
                    <span className="text-xs font-bold text-whatsapp-teal">{book.count} interações</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-whatsapp-teal rounded-full" 
                      style={{ width: \`\${Math.max(10, (book.count / (metrics.topBooks[0]?.count || 1)) * 100)}%\` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {metrics.topBooks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem dados suficientes.</p>}
          </div>
        </div>

        {/* Versículos Mais Comentados */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" /> 
            Versículos Mais Comentados
          </h3>
          <div className="space-y-4">
            {metrics.topVerses.map((verse, idx) => {
              const bookObj = BIBLE_BOOKS.find(b => b.abbrev === verse.book);
              return (
                <div key={verse.key} className="flex items-center justify-between p-3 rounded-xl border border-border bg-gray-50/50 dark:bg-white/5 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-black text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{bookObj?.name || verse.book} {verse.chapter}:{verse.verse}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white dark:bg-[#111] border border-border rounded-lg shadow-sm">
                    <span className="font-black text-xs text-blue-600">{verse.count}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">comentários</span>
                  </div>
                </div>
              );
            })}
            {metrics.topVerses.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário registrado ainda.</p>}
          </div>
        </div>
      </div>

      {/* Ranking / Histórico de Usuários */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-whatsapp-teal" /> 
            Histórico & Ranking de Leitores
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar usuário..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs border border-border rounded-xl bg-gray-50 dark:bg-[#111] w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-whatsapp-teal"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-semibold pl-2">Usuário</th>
                <th className="pb-3 font-semibold text-center">Capítulos Lidos</th>
                <th className="pb-3 font-semibold text-center">Interações Extras</th>
                <th className="pb-3 font-semibold text-right pr-2">Última Leitura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredUsers.map((item, idx) => (
                <tr key={item.user?.username || idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.user?.avatar_url || \`https://ui-avatars.com/api/?name=\${item.user?.full_name || 'U'}&background=random\`}
                        className="w-8 h-8 rounded-full border border-border object-cover"
                        alt=""
                      />
                      <div>
                        <p className="font-bold text-xs text-foreground">{item.user?.full_name || 'Usuário'}</p>
                        <p className="text-[10px] text-muted-foreground">@{item.user?.username || 'user'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800 px-2 py-0.5 rounded-md font-bold text-xs">
                      <Check className="w-3 h-3" /> {item.reads}
                    </span>
                  </td>
                  <td className="py-3 text-center font-bold text-xs text-muted-foreground">
                    {item.interactions}
                  </td>
                  <td className="py-3 text-right pr-2 text-xs text-muted-foreground flex justify-end items-center gap-1.5 h-full pt-4">
                    <Clock className="w-3 h-3" />
                    {moment(item.lastActive).fromNow()}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                    Nenhum leitor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
