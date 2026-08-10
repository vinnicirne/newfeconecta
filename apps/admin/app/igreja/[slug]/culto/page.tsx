"use client";

import { useState, useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

const Pip = registerPlugin<any>('Pip');
import { Play, Pause, Users, MessageCircle, Heart, Share2, Video, Settings, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LiveCulto({ params }: { params: { slug: string } }) {
  const [church, setChurch] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [liveUrlInput, setLiveUrlInput] = useState("");
  const [viewerCount, setViewerCount] = useState(1);
  const [youtubeViewerCount, setYoutubeViewerCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [chatType, setChatType] = useState<'app' | 'youtube'>('youtube');
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    setHostname(window.location.hostname);
    loadChurch();
  }, [params.slug]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      Pip.enablePip().catch(console.warn);
      return () => {
        Pip.disablePip().catch(console.warn);
      };
    }
  }, []);

  useEffect(() => {
    if (!church?.id) return;

    const fetchComments = async () => {
      const { data } = await supabase
        .from('church_live_comments')
        .select('*')
        .eq('church_id', church.id)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (data) {
        setComments(data.map(c => ({ user: c.user_name, message: c.message })));
      }
    };
    fetchComments();

    const channel = supabase.channel(`live_culto_${church.id}`, {
      config: {
        presence: { key: currentUser?.id || Math.random().toString() },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        for (const key in state) count += state[key].length;
        setViewerCount(Math.max(1, count));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'church_live_comments', filter: `church_id=eq.${church.id}` }, (payload) => {
        setComments((current) => [...current, { user: payload.new.user_name, message: payload.new.message }]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [church?.id, currentUser?.id]);

  async function loadChurch() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);

    const { data } = await supabase
      .from('churches')
      .select('*')
      .eq('slug', params.slug)
      .single();
    setChurch(data);

    if (data?.youtube_live_url) {
      setLiveUrlInput(data.youtube_live_url);
      fetchYoutubeDetails(data.youtube_live_url);
    }

    if (user) {
      if (data?.pastor_id === user.id) {
        setIsLeader(true);
      } else {
        const { data: member } = await supabase
          .from('church_members')
          .select('role')
          .eq('church_id', data?.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (member?.role === 'admin' || member?.role === 'leader') {
          setIsLeader(true);
        }
      }
    }

    setIsLive(true);
    setLiveTitle("Culto de Avivamento");
  }

  async function fetchYoutubeDetails(url: string) {
    try {
      const vId = getYouTubeId(url);
      if (vId) {
        const res = await fetch(`/api/youtube/viewers?videoId=${vId}`);
        const data = await res.json();
        
        if (data.title) setLiveTitle(data.title);
        if (data.viewers !== undefined) {
          setYoutubeViewerCount(data.viewers);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveLiveUrl() {
    if (!church) return;
    const { error } = await supabase
      .from('churches')
      .update({ youtube_live_url: liveUrlInput })
      .eq('id', church.id);
    
    if (error) {
      toast.error("Erro ao salvar link da transmissão");
    } else {
      toast.success("Link da transmissão atualizado com sucesso!");
      setChurch({ ...church, youtube_live_url: liveUrlInput });
      fetchYoutubeDetails(liveUrlInput);
    }
  }

  function getPlatform(url: string) {
    if (!url) return null;
    if (url.includes('instagram.com')) return 'instagram';
    return 'youtube';
  }

  function togglePlay() {
    setIsPlaying(!isPlaying);
  }

  function getYouTubeId(url: string) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const livePlatform = getPlatform(church?.youtube_live_url);
  const videoId = livePlatform === 'youtube' ? getYouTubeId(church?.youtube_live_url) : null;

  useEffect(() => {
    if (livePlatform === 'youtube' && videoId) {
      const interval = setInterval(async () => {
        try {
          const viewerRes = await fetch(`/api/youtube/viewers?videoId=${videoId}`);
          const viewerData = await viewerRes.json();
          if (viewerData.viewers !== undefined) {
            setYoutubeViewerCount(viewerData.viewers);
          }
        } catch (e) {
          console.error(e);
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [livePlatform, videoId]);

  async function sendComment() {
    if (!newComment.trim() || !church || !currentUser) {
      if (!currentUser) toast.error("Faça login para comentar!");
      return;
    }

    const message = newComment;
    setNewComment("");

    const { data: profile } = await supabase.from('profiles').select('name').eq('id', currentUser.id).single();
    const userName = profile?.name || "Anônimo";

    const { error } = await supabase.from('church_live_comments').insert({
      church_id: church.id,
      user_id: currentUser.id,
      user_name: userName,
      message: message
    });

    if (error) {
      toast.error("Erro ao enviar mensagem");
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      {/* Header do Culto */}
      <div className="sticky top-0 bg-[#111B21] border-b border-[#25D366]/30 z-50 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {church?.youtube_live_url ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-500 font-bold text-sm tracking-widest">AO VIVO</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-gray-500 rounded-full" />
                  <span className="text-gray-500 font-bold text-sm tracking-widest">OFFLINE</span>
                </>
              )}
            </div>
            <h1 className="font-black text-xl">{church?.youtube_live_url ? liveTitle : "Sem transmissão"}</h1>
            <p className="text-xs text-gray-400">{church?.name}</p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl">
            <Users className="text-[#25D366]" />
            <span className="font-bold">{viewerCount + youtubeViewerCount}</span>
            <span className="text-xs text-gray-400">assistindo</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
        {/* Player do Culto */}
        <div className="lg:col-span-8">
          {isLeader && (
            <div className="bg-[#111B21] rounded-3xl p-5 mb-6 border border-[#25D366]/30">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <Settings className="text-[#25D366]" /> Configurar Transmissão ao Vivo
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  value={liveUrlInput}
                  onChange={(e) => setLiveUrlInput(e.target.value)}
                  placeholder="Link do YouTube ou Instagram..."
                  className="flex-1 min-w-0 bg-[#1A2429] border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#25D366]/50"
                />
                <button 
                  onClick={saveLiveUrl}
                  className="bg-[#25D366] text-black w-full sm:w-auto px-6 py-3 rounded-2xl font-bold hover:bg-[#20bd5a] transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          <div className="aspect-video bg-black rounded-3xl overflow-hidden relative border border-white/10 flex items-center justify-center">
            {livePlatform === 'youtube' && videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`}
                title="Culto ao Vivo"
                className="w-full h-full absolute inset-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : livePlatform === 'instagram' && church?.youtube_live_url ? (
              <div className="text-center p-6 flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
                  <Video size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-black mb-2">Transmissão no Instagram</h3>
                <p className="text-gray-400 mb-6">O culto está sendo transmitido ao vivo pelo Instagram.</p>
                <a href={church.youtube_live_url} target="_blank" className="bg-white text-black px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                  <ExternalLink size={20} /> Assistir Agora
                </a>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col items-center justify-center">
                  <Video size={48} className="text-white/30 mb-4" />
                  <p className="text-white/50 text-lg font-bold">Nenhuma transmissão acontecendo no momento.</p>
                </div>
                <div className="absolute bottom-6 left-6 bg-black/70 px-4 py-1 rounded-full text-xs flex items-center gap-2">
                  OFFLINE
                </div>
              </>
            )}
          </div>

          {/* Título e Descrição */}
          <div className="mt-6 px-2">
            <h2 className="text-2xl font-black">{church?.youtube_live_url ? liveTitle : "Nenhuma Transmissão"}</h2>
            <p className="text-gray-400 mt-2">{church?.youtube_live_url ? "Culto de Avivamento com Pr. Marcos" : "O pastor precisa configurar o link do YouTube no Painel."}</p>
          </div>
        </div>

        {/* Chat ao Vivo */}
        <div className="lg:col-span-4 bg-[#111B21] rounded-3xl flex flex-col h-[400px] lg:h-[600px] overflow-hidden">
          <div className="p-3 border-b border-white/10 flex gap-2">
            <button
              onClick={() => setChatType('app')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${chatType === 'app' ? 'bg-[#25D366] text-black' : 'hover:bg-white/5 text-white/50'}`}
            >
              <MessageCircle size={16} /> Chat da Igreja
            </button>
            {livePlatform === 'youtube' && videoId && (
              <button
                onClick={() => setChatType('youtube')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${chatType === 'youtube' ? 'bg-[#FF0000] text-white' : 'hover:bg-white/5 text-white/50'}`}
              >
                <Video size={16} /> YouTube Chat
              </button>
            )}
          </div>

          {chatType === 'youtube' && livePlatform === 'youtube' && videoId && hostname ? (
            <div className="flex-1 bg-white relative">
              <iframe
                src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${hostname}`}
                className="w-full h-full absolute inset-0"
                frameBorder="0"
              />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                {comments.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="text-[#25D366] font-bold">@{c.user}</div>
                    <div>{c.message}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                    placeholder="Escreva sua mensagem..."
                    className="flex-1 bg-[#1A2429] border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none"
                  />
                  <button 
                    onClick={sendComment}
                    className="bg-[#25D366] text-black px-8 rounded-2xl font-bold"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
