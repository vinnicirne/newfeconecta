"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, BookOpen, UserCircle2, MessageCircle, Church } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    profiles: any[];
    posts: any[];
    churches: any[];
    bibleRef?: { book: string; ref: string; full: string } | null;
  }>({ profiles: [], posts: [], churches: [], bibleRef: null });
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults({ profiles: [], posts: [], churches: [], bibleRef: null });
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (text: string) => {
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

      const [profilesRes, postsRes, churchesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, is_verified')
          .or(`username.ilike.%${cleanText}%,full_name.ilike.%${cleanText}%`)
          .limit(5),
        supabase
          .from('posts')
          .select('id, content, likes_count, user_id')
          .ilike('content', `%${cleanText}%`)
          .limit(3),
        supabase
          .from('churches')
          .select('id, name, slug, member_count')
          .ilike('name', `%${cleanText}%`)
          .limit(3)
      ]);

      setResults({
        profiles: profilesRes.data || [],
        posts: postsRes.data || [],
        churches: churchesRes.data || [],
        bibleRef: bibleMatch
      });
      setIsOpen(true);
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      router.push(`/explore?q=${encodeURIComponent(query)}`);
    }
  };

  const hasResults = results.bibleRef || results.profiles.length > 0 || results.posts.length > 0 || results.churches.length > 0;

  return (
    <div className="relative w-full max-w-lg" ref={wrapperRef}>
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar versículos, igrejas, pessoas..."
          className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-whatsapp-teal/30 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none transition-all shadow-inner"
        />
        {searching && (
          <Loader2 className="absolute right-3 w-4 h-4 text-whatsapp-teal animate-spin" />
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111B21] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-50 flex flex-col max-h-[70vh]">
          <div className="overflow-y-auto no-scrollbar p-2">
            {!searching && !hasResults && (
              <div className="p-4 text-center text-sm text-gray-500">Nenhum resultado encontrado.</div>
            )}

            {results.bibleRef && (
              <div className="mb-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 px-3 py-1.5">Bíblia</div>
                <button 
                  onClick={() => { setIsOpen(false); router.push(`/bible?verse=${results.bibleRef?.ref}`); }}
                  className="w-full flex flex-col text-left px-3 py-2 hover:bg-emerald-500/10 rounded-xl transition-colors group"
                >
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> {results.bibleRef.full}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">Abrir na Bíblia Sagrada</span>
                </button>
              </div>
            )}

            {results.churches.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 px-3 py-1.5">Igrejas</div>
                {results.churches.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => { setIsOpen(false); router.push(`/igreja/${c.slug}`); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                      <Church className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-start flex-1 text-left">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{c.name}</span>
                      <span className="text-[10px] text-gray-500">{c.member_count} membros</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.profiles.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-whatsapp-teal px-3 py-1.5">Pessoas</div>
                {results.profiles.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => { setIsOpen(false); router.push(`/u/${p.username}`); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-800 shrink-0">
                      {p.avatar_url && !p.avatar_url.includes('shadcn') ? (
                        <img src={p.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle2 className="w-full h-full text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col items-start flex-1 text-left overflow-hidden">
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate w-full">{p.full_name}</span>
                      <span className="text-[10px] text-gray-500 truncate w-full">@{p.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.posts.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-1.5">Posts</div>
                {results.posts.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => { setIsOpen(false); router.push(`/explore?q=${encodeURIComponent(query)}`); }}
                    className="w-full flex items-start gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 text-left line-clamp-2">{p.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => { setIsOpen(false); router.push(`/explore?q=${encodeURIComponent(query)}`); }}
            className="w-full p-3 bg-black/5 dark:bg-white/5 text-xs font-bold text-whatsapp-teal text-center hover:bg-whatsapp-teal/10 transition-colors"
          >
            Ver todos os resultados na aba Explorar
          </button>
        </div>
      )}
    </div>
  );
}
