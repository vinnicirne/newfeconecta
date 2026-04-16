"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, Search, Flame } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { UserCircle2, BookOpen, ChevronRight, Hash, MessageCircle } from "lucide-react";

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    profiles: any[];
    posts: any[];
    bibleRef?: { book: string; ref: string; full: string } | null;
  }>({ profiles: [], posts: [], bibleRef: null });
  
  const [popularTopics, setPopularTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadTrends = async () => {
      try {
        const { data: popular } = await supabase
          .from('posts')
          .select('id, content, likes_count, comments_count')
          .order('likes_count', { ascending: false })
          .limit(10);

        if (isMounted) setPopularTopics(popular || []);
      } catch (e) {
        console.error("Erro loading explore", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadTrends();
    return () => { isMounted = false; };
  }, []);

  const handleSearch = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResults({ profiles: [], posts: [], bibleRef: null });
      return;
    }

    setSearching(true);
    const cleanText = text.trim();
    
    try {
      let bibleMatch = null;
      const bibleRegex = /(\d?\s?[a-zà-ÿ]+)?\s?(\d+)(?::(\d+))?/i;
      const m = cleanText.match(bibleRegex);
      
      if (m && (m[2] || m[1])) {
        const bookPart = (m[1] || "").toLowerCase().trim();
        const chapter = m[2];
        const verse = m[3];
        
        const book = BIBLE_BOOKS.find(b => 
          (bookPart && b.name.toLowerCase().includes(bookPart)) || 
          (bookPart && b.abbrev.toLowerCase() === bookPart)
        );

        if (book || (chapter && verse)) {
          bibleMatch = { 
            book: book?.name || "Bíblia", 
            ref: `${book?.abbrev || 'mc'}${chapter || '1'}${verse ? ':' + verse : ':1'}`,
            full: `${book?.name || ''} ${chapter || ''}${verse ? ':' + verse : ''}`.trim()
          };
        }
      }

      const [profilesRes, postsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, is_verified')
          .or(`username.ilike.%${cleanText}%,full_name.ilike.%${cleanText}%`)
          .limit(5),
        supabase
          .from('posts')
          .select('id, content, likes_count, comments_count, user_id')
          .ilike('content', `%${cleanText}%`)
          .limit(10)
      ]);

      setResults({
        profiles: profilesRes.data || [],
        posts: postsRes.data || [],
        bibleRef: bibleMatch
      });
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const extractHashtagOrTitle = (content: string) => {
    if (!content) return "Publicação Viral";
    const match = content.match(/#[\wáàâãéèêíïóôõöúç-]+/);
    if (match) return match[0];
    const text = content.replace(/<[^>]*>?/gm, '').trim();
    return text.length > 50 ? text.substring(0, 50) + "..." : text;
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 relative min-h-screen">
      <div className="px-4 pt-6 pb-2">
        <PageHeader title={query.trim() ? "Resultados" : "Explorar"} description={query.trim() ? `Buscando por "${query}"` : "Assuntos em alta no FéConecta"} />
        
        {/* Barra de Busca Real */}
        <div className="relative mb-8">
          <Search className={cn(
            "w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
            searching ? "text-whatsapp-teal animate-pulse" : "text-gray-400"
          )} />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar usuários, hashtags, bíblia..." 
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm focus:ring-2 focus:ring-whatsapp-teal outline-none transition-all dark:text-white text-base"
            autoFocus
          />
        </div>

        {/* RESULTADOS DA BUSCA */}
        {query.trim() !== "" ? (
          <div className="space-y-6">
            
            {/* 1. SEÇÃO BÍBLIA (Destaque) */}
            {results.bibleRef && (
              <div 
                onClick={() => router.push(`/bible?verse=${results.bibleRef?.ref}`)}
                className="bg-gradient-to-br from-whatsapp-teal to-emerald-600 p-5 rounded-2xl text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Ir para a Bíblia</p>
                      <h4 className="text-xl font-black">{results.bibleRef.full}</h4>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </div>
              </div>
            )}

            {/* 2. PESSOAS */}
            {results.profiles.length > 0 && (
              <div className="bg-white dark:bg-whatsapp-darkLighter p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                  <UserCircle2 className="w-4 h-4" /> Pessoas
                </h3>
                <div className="space-y-4">
                  {results.profiles.map(p => (
                    <Link key={p.id} href={`/profile/${p.username}`} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 dark:border-white/10">
                          <img src={p.avatar_url || "https://github.com/shadcn.png"} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white group-hover:text-whatsapp-teal transition-colors">{p.full_name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">@{p.username}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 3. PUBLICAÇÕES / PALAVRAS / HASHTAGS */}
            <div className="bg-white dark:bg-whatsapp-darkLighter p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                  <Hash className="w-4 h-4" /> Publicações e Tópicos
                </h3>
                <div className="space-y-6">
                  {results.posts.length > 0 ? results.posts.map((post, i) => (
                    <div key={post.id} className="group cursor-pointer">
                      <p className="text-[11px] text-whatsapp-teal font-black mb-1 uppercase tracking-wider">Resultado da busca</p>
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                        {extractHashtagOrTitle(post.content || '')}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5">
                           <Flame className="w-3.5 h-3.5 text-orange-500" /> {post.likes_count || 0}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5">
                           <MessageCircle className="w-3.5 h-3.5 text-gray-400" /> {post.comments_count || 0}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhum post encontrado para esta busca.</p>
                  )}
                </div>
            </div>

          </div>
        ) : (
          /* TENDÊNCIAS (Empty State) */
          <div className="bg-white dark:bg-whatsapp-darkLighter p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6 uppercase text-xs tracking-widest opacity-60">
              <TrendingUp className="w-4 h-4 text-whatsapp-teal" />
              Trending Topics no FéConecta
            </h3>
            
            {loading ? (
              <div className="animate-pulse space-y-6">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="flex gap-4">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-white/10 rounded-full"></div>
                    <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4"></div><div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/4"></div></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {popularTopics.map((post, i) => (
                  <Link href={`#`} key={i} className="flex items-start gap-4 group">
                    <div className="font-bold text-gray-300 dark:text-white/20 text-xl w-6 text-center mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-wider">Populares</p>
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-whatsapp-teal transition-colors leading-snug">
                        {extractHashtagOrTitle(post.content || '')}
                      </p>
                      <p className="text-xs text-gray-400 font-medium mt-1.5 flex items-center gap-1.5">
                         <Flame className="w-3.5 h-3.5 text-orange-500" /> {post.likes_count || 0} interações
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
