"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, 
  Sparkles, 
  ArrowLeft, 
  Flame, 
  Radio, 
  Eye, 
  RefreshCw, 
  Play, 
  Clock, 
  Layers,
  Search
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import moment from "moment";

const StoryCreator = dynamic(() => import("@/components/feed/StoryCreator"), { ssr: false });
const StoryViewer = dynamic(() => import("@/components/feed/StoryViewer"), { ssr: false });

export default function StoriesPage() {
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("*").eq("id", user.id).single()
          .then(({ data }) => setCurrentUser(data || user));
      }
    });
    loadStories();
  }, []);

  const loadStories = async () => {
    setLoading(true);
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (storiesError) throw storiesError;

      const userIds = Array.from(new Set(storiesData?.map(s => s.author_id) || [])).filter(Boolean);

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);

        const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const groups = userIds.map(uid => {
          const userStories = (storiesData || []).filter(s => s.author_id === uid);
          const author = profilesMap[uid] || {};
          return {
            author_id: uid,
            author_name: author.full_name || author.username || "Membro FéConecta",
            author_username: author.username,
            author_avatar: author.avatar_url,
            stories: userStories,
            latest_time: userStories[userStories.length - 1]?.created_at
          };
        }).filter(g => g.stories.length > 0);

        setStoryGroups(groups);
      } else {
        setStoryGroups([]);
      }
    } catch (err) {
      console.error("Erro ao carregar stories:", err);
      setStoryGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = storyGroups.filter(g => 
    g.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.author_username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myGroupIndex = storyGroups.findIndex(g => g.author_id === currentUser?.id);
  const myGroup = myGroupIndex !== -1 ? storyGroups[myGroupIndex] : null;

  return (
    <div className="min-h-screen bg-[#0b1326] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#090f1e]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Status & Stories
            </h1>
            <p className="text-xs text-gray-400">Momentos e testemunhos da comunidade FéConecta</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCreator(true)}
            className="px-4 py-2 bg-whatsapp-teal hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-whatsapp-teal/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Criar Status
          </button>
          <button 
            onClick={loadStories}
            disabled={loading}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-300"
            title="Recarregar"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar status por nome de irmão..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131d33] text-xs text-gray-200 pl-9 pr-4 py-2.5 rounded-2xl border border-white/10 focus:outline-none focus:border-emerald-400 placeholder-gray-500 transition-all"
          />
        </div>

        {/* My Status Banner Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#131d33] to-[#0f172a] border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-whatsapp-green bg-whatsapp-teal/10 flex items-center justify-center">
                {currentUser?.avatar_url && !currentUser?.avatar_url.includes('vercel.sh') ? (
                  <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-xl font-black text-whatsapp-teal uppercase">
                    {currentUser?.full_name ? currentUser.full_name[0] : 'U'}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowCreator(true)}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-whatsapp-green text-whatsapp-dark flex items-center justify-center border-2 border-[#0b1326] shadow-md hover:scale-110 transition-transform"
              >
                <Plus className="w-3.5 h-3.5 font-bold" />
              </button>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Meu Status</h3>
              <p className="text-xs text-gray-400">
                {myGroup ? `${myGroup.stories.length} momento(s) ativo(s)` : "Toque no '+' para compartilhar com a igreja"}
              </p>
            </div>
          </div>

          {myGroup && (
            <button 
              onClick={() => setSelectedGroupIndex(myGroupIndex)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Ver Meu Status
            </button>
          )}
        </div>

        {/* Stories List */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" /> Todos os Status Ativos ({filteredGroups.length})
          </h2>

          {loading ? (
            <div className="py-20 text-center text-gray-500 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <p className="text-xs font-bold uppercase tracking-widest">Sintonizando status...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-white/5 rounded-3xl border border-dashed border-white/10 p-8">
              <Sparkles className="w-12 h-12 text-emerald-400/50 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhum status ativo no momento</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Seja o primeiro a publicar um momento de louvor, oração ou versículo com a comunidade!
              </p>
              <button
                onClick={() => setShowCreator(true)}
                className="px-6 py-3 bg-whatsapp-teal text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-whatsapp-teal/20 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Criar Primeiro Status
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredGroups.map((group, idx) => {
                const isMine = group.author_id === currentUser?.id;
                const latestStory = group.stories[group.stories.length - 1];
                const realIndex = storyGroups.findIndex(g => g.author_id === group.author_id);

                return (
                  <div
                    key={group.author_id}
                    onClick={() => setSelectedGroupIndex(realIndex)}
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group border border-white/10 hover:border-emerald-500/50 transition-all hover:scale-[1.02] shadow-xl bg-black"
                  >
                    {/* Media Thumbnail */}
                    {latestStory?.media_type === 'image' && (
                      <img src={latestStory.media_url?.split('#')[0]} className="w-full h-full object-cover" alt="" />
                    )}
                    {latestStory?.media_type === 'video' && (
                      <video src={latestStory.media_url?.split('#')[0]} className="w-full h-full object-cover" muted />
                    )}
                    {latestStory?.media_type === 'text' && (
                      <div className="w-full h-full flex items-center justify-center p-4 text-center font-bold text-xs" style={{ backgroundColor: latestStory.background_color || '#075E54' }}>
                        <span className="line-clamp-4">{latestStory.content}</span>
                      </div>
                    )}
                    {latestStory?.media_type === 'audio' && (
                      <div className="w-full h-full flex items-center justify-center p-4 bg-zinc-900 text-center font-bold text-xs text-whatsapp-green">
                        Áudio de Oração 🎙️
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

                    {/* Author Avatar Top Left */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-400 bg-whatsapp-teal/20 flex items-center justify-center shadow-lg">
                        {group.author_avatar && !group.author_avatar.includes('vercel.sh') ? (
                          <img src={group.author_avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-[10px] font-black uppercase text-white">
                            {group.author_name ? group.author_name[0] : 'U'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Story Count Badge Top Right */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-emerald-300 border border-white/10">
                      {group.stories.length}
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <p className="text-xs font-bold text-white truncate drop-shadow-md">
                        {isMine ? "Você" : group.author_name}
                      </p>
                      <p className="text-[10px] text-gray-300 opacity-80 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment(group.latest_time).fromNow()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Story Creator Modal */}
      {showCreator && (
        <StoryCreator
          open={showCreator}
          onClose={() => setShowCreator(false)}
          user={currentUser}
          onCreated={() => {
            setShowCreator(false);
            loadStories();
          }}
        />
      )}

      {/* Story Viewer Modal */}
      {selectedGroupIndex !== null && storyGroups.length > 0 && (
        <StoryViewer
          storyGroups={storyGroups}
          startUserIndex={selectedGroupIndex}
          currentUser={currentUser}
          onClose={() => {
            setSelectedGroupIndex(null);
            loadStories();
          }}
        />
      )}
    </div>
  );
}
