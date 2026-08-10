"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Users, FileText, Heart, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import moment from "moment";

export function ChurchSearchModal({ open, onOpenChange, churchId, churchSlug }: any) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    posts: any[];
    members: any[];
    groups: any[];
  }>({ posts: [], members: [], groups: [] });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ posts: [], members: [], groups: [] });
    }
  }, [open]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults({ posts: [], members: [], groups: [] });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  async function performSearch() {
    setLoading(true);
    const searchTerm = `%${query}%`;
    
    const [postsRes, membersRes, groupsRes] = await Promise.all([
      supabase.from('church_posts').select('id, content, created_at, author:profiles(full_name)').eq('church_id', churchId).ilike('content', searchTerm).limit(5),
      supabase.from('church_members').select('role, profiles!inner(id, full_name, avatar_url)').eq('church_id', churchId).ilike('profiles.full_name', searchTerm).limit(5),
      supabase.from('church_groups').select('id, name, type').eq('church_id', churchId).ilike('name', searchTerm).limit(5)
    ]);

    setResults({
      posts: postsRes.data || [],
      members: membersRes.data || [],
      groups: groupsRes.data || []
    });
    
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 bg-card border-border rounded-3xl">
        <div className="flex flex-col gap-4 max-h-[80vh]">
          <h2 className="text-xl font-bold">Buscar na Comunidade</h2>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              autoFocus
              placeholder="Pesquisar publicações, membros, grupos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-muted text-foreground border-none rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-whatsapp-teal outline-none"
            />
          </div>
          
          <div className="overflow-y-auto no-scrollbar flex-1 -mx-2 px-2">
            {!query ? (
              <div className="text-sm text-muted-foreground text-center py-10">
                Digite algo para buscar no mural, membros ou ministérios.
              </div>
            ) : loading ? (
              <div className="text-sm text-muted-foreground text-center py-10">Buscando...</div>
            ) : results.posts.length === 0 && results.members.length === 0 && results.groups.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10">Nenhum resultado encontrado para "{query}".</div>
            ) : (
              <div className="space-y-6 pb-4">
                
                {results.members.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-widest"><Users size={14}/> Membros</h3>
                    <div className="space-y-2">
                      {results.members.map((m: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors">
                          <img src={m.profiles.avatar_url || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" />
                          <div>
                            <p className="font-bold text-sm text-foreground">{m.profiles.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.groups.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-widest"><Heart size={14}/> Grupos & Ministérios</h3>
                    <div className="space-y-2">
                      {results.groups.map((g: any) => (
                        <Link href={`/igreja/${churchSlug}/celula/${g.id}`} key={g.id} onClick={() => onOpenChange(false)} className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/60 rounded-xl transition-colors">
                          <span className="font-bold text-sm">{g.name}</span>
                          <span className="text-xs px-2 py-1 bg-background rounded-md capitalize">{g.type}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.posts.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-widest"><FileText size={14}/> Publicações</h3>
                    <div className="space-y-2">
                      {results.posts.map((p: any) => (
                        <div key={p.id} className="p-3 bg-muted/30 hover:bg-muted/60 rounded-xl cursor-pointer transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-whatsapp-teal">{p.author?.full_name}</span>
                            <span className="text-[10px] text-muted-foreground">{moment(p.created_at).fromNow()}</span>
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">{p.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
