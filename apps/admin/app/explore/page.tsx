"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, Search, Flame } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function ExplorePage() {
  const [popularTopics, setPopularTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadTrends = async () => {
      try {
        const { data: popular } = await supabase
          .from('posts')
          .select('id, content, likes_count, comments_count')
          .order('likes_count', { ascending: false })
          .limit(10); // maiores virais

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
        <PageHeader title="Explorar" description="Assuntos em alta no FéConecta" />
        
        {/* Falsa barra de busca (MVP minimalista visual) */}
        <div className="relative mb-8">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-whatsapp-teal outline-none transition-all dark:text-white"
          />
        </div>

        <div className="bg-white dark:bg-whatsapp-darkLighter p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-whatsapp-teal" />
            Trending Topics
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
      </div>
    </div>
  );
}
