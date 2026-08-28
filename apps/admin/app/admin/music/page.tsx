"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Music, Sparkles, RefreshCw, Check, Plus, Trash2, Edit2, 
  Play, Pause, Search, Radio, Headphones, ListMusic, 
  Share2, ShieldCheck, ExternalLink, ArrowUpRight, Flame,
  CheckCircle2, Volume2, Clock, Eye, EyeOff, Sliders, VolumeX, 
  ListPlus, ShieldAlert, AlertTriangle, UserX, BellRing, Filter,
  User, CheckCircle, Ban, History
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { READY_SESSIONS, ReadySession } from "@/modules/femusic/domain/sessions";
import { YouTubeService } from "@/modules/femusic/infrastructure/services/YouTubeService";
import { MusicTrack } from "@/modules/femusic/domain/entities/MusicTrack";

interface FeMusicConfig {
  enable_femusic_feed: boolean;
  enable_autoplay: boolean;
  allow_public_playlists: boolean;
  enable_music_feed_share: boolean;
  default_search_tag: string;
}

interface FeMusicStats {
  totalPlaylists: number;
  totalPlaylistTracks: number;
  totalMusicShares: number;
  activeSessionsCount: number;
}

export interface ModeratedTrackItem {
  id: string;
  provider_track_id: string;
  title: string;
  artist: string;
  cover?: string | null;
  duration?: number | null;
  source_type: "playlist" | "feed_post" | "audio_cache" | "track";
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email?: string | null;
    is_verified?: boolean;
    verification_label?: string | null;
  } | null;
  isSecularSuspect: boolean;
}

export default function AdminFeMusicPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Controles Globais do FéMusic
  const [config, setConfig] = useState<FeMusicConfig>({
    enable_femusic_feed: true,
    enable_autoplay: true,
    allow_public_playlists: true,
    enable_music_feed_share: true,
    default_search_tag: "louvor e adoração gospel oficial",
  });

  // Métricas 100% REAIS do Supabase (Zero Mocks)
  const [stats, setStats] = useState<FeMusicStats>({
    totalPlaylists: 0,
    totalPlaylistTracks: 0,
    totalMusicShares: 0,
    activeSessionsCount: READY_SESSIONS.length,
  });

  // Sessões Prontas (Curadoria do Admin)
  const [sessions, setSessions] = useState<ReadySession[]>(READY_SESSIONS);
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [editingSessionData, setEditingSessionData] = useState<ReadySession | null>(null);

  // Busca e Pré-escuta de Louvores
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSessionForAdd, setSelectedSessionForAdd] = useState<string>("");

  // Moderação de Músicas & Usuários
  const [moderatedTracks, setModeratedTracks] = useState<ModeratedTrackItem[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [trackSearchFilter, setTrackSearchFilter] = useState("");
  const [trackSourceFilter, setTrackSourceFilter] = useState<string>("all");
  const [trackStatusFilter, setTrackStatusFilter] = useState<"all" | "suspect" | "banned">("all");

  // Modais de Ação Disciplinar
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedTrackForAction, setSelectedTrackForAction] = useState<ModeratedTrackItem | null>(null);
  const [customNotifyMessage, setCustomNotifyMessage] = useState(
    "Aviso da Moderação FéConecta: Identificamos a inserção de músicas não-cristãs/seculares em sua conta. O FéConecta é um espaço exclusivamente dedicado ao louvor e à adoração a Deus. Por favor, remova o conteúdo ou sua conta poderá ser suspensa."
  );
  const [suspendDurationDays, setSuspendDurationDays] = useState<number>(7);

  useEffect(() => {
    loadAllData();
    loadModeratedTracks();

    // Sincronização em tempo real via WebSocket
    const channel = supabase.channel("admin_femusic_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_configs" },
        () => loadConfigsOnly()
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, []);

  const loadConfigsOnly = async () => {
    try {
      const { data } = await supabase
        .from("system_configs")
        .select("value")
        .eq("key", "femusic_system_config_v1")
        .maybeSingle();

      if (data?.value) {
        if (data.value.config) setConfig(data.value.config);
        if (data.value.sessions && Array.isArray(data.value.sessions)) {
          setSessions(data.value.sessions);
        }
      }
    } catch (err) {
      console.warn("[FeMusic] Erro ao sincronizar configs:", err);
    }
  };

  const checkSecularSuspect = (title: string, artist: string): boolean => {
    const text = `${title} ${artist}`.toLowerCase();
    const gospelKeywords = [
      "gospel", "louvor", "adoração", "adoracao", "deus", "jesus", "cristo", 
      "senhor", "igreja", "culto", "harpa", "hino", "worship", "praise",
      "fé", "feconecta", "santidade", "salvação", "salvacao", "glória", "gloria",
      "pastor", "ministério", "ministerio", "cantor cristão", "cantora cristã",
      "gabriela rocha", "morada", "fernandinho", "aline barros", "anderson freire",
      "isadora pompeo", "casa worship", "theo rubia", "kemuel", "diante do trono",
      "midian lima", "davi sacer", "bruna karla", "cassiane", "laura souguellis"
    ];

    const hasGospelKeyword = gospelKeywords.some(keyword => text.includes(keyword));
    return !hasGospelKeyword; // Suspeita se não contiver nenhum termo cristão
  };

  const loadModeratedTracks = async () => {
    setLoadingTracks(true);
    try {
      const itemsMap = new Map<string, ModeratedTrackItem>();

      // 1. Faixas de Playlists com dados do criador da playlist
      const { data: playlistTracks, error: ptErr } = await supabase
        .from("music_playlist_tracks")
        .select(`
          id,
          track_id,
          track_data,
          added_at,
          playlist:music_playlists (
            id,
            title,
            user_id,
            user:profiles (id, full_name, username, avatar_url, is_verified, verification_label)
          )
        `)
        .order("added_at", { ascending: false })
        .limit(60);

      if (!ptErr && playlistTracks) {
        for (const item of playlistTracks) {
          const tData = item.track_data || {};
          const trackId = tData.providerTrackId || tData.id || item.track_id;
          const title = tData.title || "Louvor";
          const artist = tData.artist || "Artista";
          const playlistUser = (item.playlist as any)?.user;

          itemsMap.set(`pt-${item.id}`, {
            id: item.id,
            provider_track_id: trackId,
            title,
            artist,
            cover: tData.cover || null,
            duration: tData.duration || null,
            source_type: "playlist",
            created_at: item.added_at || new Date().toISOString(),
            user: playlistUser ? {
              id: playlistUser.id,
              full_name: playlistUser.full_name,
              username: playlistUser.username,
              avatar_url: playlistUser.avatar_url,
              is_verified: playlistUser.is_verified,
              verification_label: playlistUser.verification_label,
            } : null,
            isSecularSuspect: checkSecularSuspect(title, artist),
          });
        }
      }

      // 2. Posts de Louvor no Feed (com autor do post)
      const { data: postTracks, error: postErr } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          media_url,
          media_data,
          created_at,
          user:profiles (id, full_name, username, avatar_url, is_verified, verification_label)
        `)
        .eq("post_type", "music")
        .order("created_at", { ascending: false })
        .limit(40);

      if (!postErr && postTracks) {
        for (const post of postTracks) {
          const mData = post.media_data || {};
          const title = mData.title || post.title || "Louvor no Feed";
          const artist = mData.artist || "Comunidade FéConecta";
          const postUser = (post as any).user;

          itemsMap.set(`post-${post.id}`, {
            id: post.id,
            provider_track_id: mData.providerTrackId || mData.id || post.id,
            title,
            artist,
            cover: mData.cover || post.media_url || null,
            duration: mData.duration || null,
            source_type: "feed_post",
            created_at: post.created_at || new Date().toISOString(),
            user: postUser ? {
              id: postUser.id,
              full_name: postUser.full_name,
              username: postUser.username,
              avatar_url: postUser.avatar_url,
              is_verified: postUser.is_verified,
              verification_label: postUser.verification_label,
            } : null,
            isSecularSuspect: checkSecularSuspect(title, artist),
          });
        }
      }

      // 3. Cache de Áudio Baixado no Servidor (femusic_cache) com usuário que baixou
      const { data: cacheTracks, error: cacheErr } = await supabase
        .from("femusic_cache")
        .select(`
          id,
          youtube_id,
          title,
          artist,
          cover,
          user_id,
          created_at,
          user:profiles (id, full_name, username, avatar_url, is_verified, verification_label)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!cacheErr && cacheTracks) {
        for (const cache of cacheTracks) {
          const title = cache.title || `Áudio Extraído [${cache.youtube_id}]`;
          const artist = cache.artist || "Download do Aplicativo";
          const cacheUser = (cache as any).user;

          itemsMap.set(`cache-${cache.id}`, {
            id: cache.id,
            provider_track_id: cache.youtube_id,
            title,
            artist,
            cover: cache.cover || null,
            duration: null,
            source_type: "audio_cache",
            created_at: cache.created_at || new Date().toISOString(),
            user: cacheUser ? {
              id: cacheUser.id,
              full_name: cacheUser.full_name,
              username: cacheUser.username,
              avatar_url: cacheUser.avatar_url,
              is_verified: cacheUser.is_verified,
              verification_label: cacheUser.verification_label,
            } : null,
            isSecularSuspect: checkSecularSuspect(title, artist),
          });
        }
      }

      setModeratedTracks(Array.from(itemsMap.values()));
    } catch (err) {
      console.error("[FeMusic] Erro ao carregar faixas para moderação:", err);
    } finally {
      setLoadingTracks(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        configRes,
        playlistsRes,
        tracksRes,
        sharesRes
      ] = await Promise.allSettled([
        supabase.from("system_configs").select("value").eq("key", "femusic_system_config_v1").maybeSingle(),
        supabase.from("music_playlists").select("*", { count: "exact", head: true }),
        supabase.from("music_playlist_tracks").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("post_type", "music"),
      ]);

      if (configRes.status === "fulfilled" && configRes.value.data?.value) {
        if (configRes.value.data.value.config) {
          setConfig(configRes.value.data.value.config);
        }
        if (configRes.value.data.value.sessions && Array.isArray(configRes.value.data.value.sessions)) {
          setSessions(configRes.value.data.value.sessions);
        }
      }

      const totalPlaylists = playlistsRes.status === "fulfilled" ? (playlistsRes.value.count || 0) : 0;
      const totalPlaylistTracks = tracksRes.status === "fulfilled" ? (tracksRes.value.count || 0) : 0;
      const totalMusicShares = sharesRes.status === "fulfilled" ? (sharesRes.value.count || 0) : 0;

      setStats({
        totalPlaylists,
        totalPlaylistTracks,
        totalMusicShares,
        activeSessionsCount: sessions.length,
      });

    } catch (err) {
      console.error("[FeMusic] Erro ao carregar telemetria:", err);
    } finally {
      setLoading(false);
    }
  };

  // Salvar Configurações Gerais e Sessões
  const handleSaveAll = async () => {
    setSaving(true);
    const toastId = toast.loading("Salvando parâmetros do FéMusic...");
    try {
      await supabase.from("system_configs").upsert({
        key: "femusic_system_config_v1",
        value: {
          config,
          sessions,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("femusic-config-updated", { detail: { config, sessions } }));
      }

      toast.success("Configurações do FéMusic salvas com sucesso! 🎵🙌", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Busca em Tempo Real no YouTube Scraper
  const handleSearchMusic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await YouTubeService.search(searchQuery.trim(), 12);
      setSearchResults(results || []);
      if (!results || results.length === 0) {
        toast.info("Nenhum louvor encontrado com este termo.");
      }
    } catch (err: any) {
      toast.error("Erro na busca: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  // AÇÕES DE MODERAÇÃO DISCIPLINAR
  // 1. Notificar Usuário sobre Música Secular
  const handleSendWarningNotification = async () => {
    if (!selectedTrackForAction?.user?.id) {
      toast.error("Usuário responsável não identificado nesta faixa.");
      return;
    }

    const toastId = toast.loading(`Enviando notificação de advertência para @${selectedTrackForAction.user.username}...`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const adminSenderId = session?.user?.id || selectedTrackForAction.user.id;

      await supabase.from("notifications").insert({
        recipient_id: selectedTrackForAction.user.id,
        sender_id: adminSenderId,
        profile_id: selectedTrackForAction.user.id,
        user_id: adminSenderId,
        type: "mention",
        content: customNotifyMessage,
        data: {
          action: "secular_music_warning",
          track_title: selectedTrackForAction.title,
          track_artist: selectedTrackForAction.artist,
        },
        read: false,
        created_at: new Date().toISOString(),
      });

      toast.success(`Advertência enviada com sucesso para @${selectedTrackForAction.user.username}! 📩`, { id: toastId });
      setNotifyModalOpen(false);
    } catch (err: any) {
      toast.error("Falha ao enviar notificação: " + err.message, { id: toastId });
    }
  };

  // 2. Bloquear Usuário Temporariamente
  const handleSuspendUser = async () => {
    if (!selectedTrackForAction?.user?.id) return;
    const toastId = toast.loading(`Aplicando suspensão de ${suspendDurationDays} dias para @${selectedTrackForAction.user.username}...`);

    try {
      const banLabel = `SUSPENSO_${suspendDurationDays}D`;
      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: false,
          verification_label: banLabel,
        })
        .eq("id", selectedTrackForAction.user.id);

      if (error) throw error;

      // Envia notificação informando o bloqueio
      const { data: { session } } = await supabase.auth.getSession();
      const adminSenderId = session?.user?.id || selectedTrackForAction.user.id;

      await supabase.from("notifications").insert({
        recipient_id: selectedTrackForAction.user.id,
        sender_id: adminSenderId,
        profile_id: selectedTrackForAction.user.id,
        user_id: adminSenderId,
        type: "mention",
        content: `Sua conta foi suspensa temporariamente por ${suspendDurationDays} dias devido à reincidência de músicas seculares no FéConecta.`,
        read: false,
        created_at: new Date().toISOString(),
      });

      toast.success(`Usuário @${selectedTrackForAction.user.username} suspenso por ${suspendDurationDays} dias! ⏱️`, { id: toastId });
      setSuspendModalOpen(false);
      loadModeratedTracks();
    } catch (err: any) {
      toast.error("Erro ao suspender usuário: " + err.message, { id: toastId });
    }
  };

  // 3. Banir Usuário Permanentemente
  const handleBanUserPermanent = async () => {
    if (!selectedTrackForAction?.user?.id) return;
    const toastId = toast.loading(`Banindo permanentemente @${selectedTrackForAction.user.username}...`);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: false,
          verification_label: "BANIDO",
        })
        .eq("id", selectedTrackForAction.user.id);

      if (error) throw error;

      toast.success(`Usuário @${selectedTrackForAction.user.username} BANIDO com sucesso! 🚫`, { id: toastId });
      setBanModalOpen(false);
      loadModeratedTracks();
    } catch (err: any) {
      toast.error("Erro ao banir usuário: " + err.message, { id: toastId });
    }
  };

  // 4. Purgar Música Secular do Banco e Cache
  const handlePurgeTrack = async (item: ModeratedTrackItem) => {
    if (!confirm(`Remover permanentemente "${item.title}" (${item.artist}) de todas as playlists, posts e cache da rede?`)) return;

    const toastId = toast.loading(`Purgando música "${item.title}" da plataforma...`);
    try {
      // Deleta do cache se houver
      await supabase.from("femusic_cache").delete().eq("youtube_id", item.provider_track_id);
      
      // Deleta das playlists
      await supabase.from("music_playlist_tracks").delete().eq("track_id", item.provider_track_id);

      // Deleta do posts de música se for post
      if (item.source_type === "feed_post") {
        await supabase.from("posts").delete().eq("id", item.id);
      }

      toast.success(`Música "${item.title}" purgada com sucesso! 🗑️`, { id: toastId });
      setModeratedTracks(prev => prev.filter(t => t.id !== item.id));
    } catch (err: any) {
      toast.error("Erro ao purgar música: " + err.message, { id: toastId });
    }
  };

  // Gerenciamento de Sessões
  const handleOpenAddSession = () => {
    setEditingSessionData({
      id: `session-${Date.now()}`,
      title: "",
      description: "",
      emoji: "🙏",
      color: "from-purple-600 to-indigo-700",
      durationLabel: "30 min",
      queries: [""],
      curatedTracks: [],
    });
    setIsEditingSession(true);
  };

  const handleEditSession = (session: ReadySession) => {
    setEditingSessionData({ ...session });
    setIsEditingSession(true);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!confirm("Tem certeza que deseja remover esta sessão de louvor?")) return;
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    toast.success("Sessão removida da lista.");
  };

  const handleSaveSessionModal = () => {
    if (!editingSessionData?.title.trim()) {
      toast.error("Informe o título da sessão.");
      return;
    }

    const cleanedQueries = (editingSessionData.queries || []).map(q => q.trim()).filter(Boolean);
    if (cleanedQueries.length === 0) {
      toast.error("Adicione pelo menos um termo de busca para a sessão.");
      return;
    }

    const sessionToSave = {
      ...editingSessionData,
      queries: cleanedQueries,
    };

    const exists = sessions.some(s => s.id === sessionToSave.id);
    let updatedList: ReadySession[];
    if (exists) {
      updatedList = sessions.map(s => s.id === sessionToSave.id ? sessionToSave : s);
    } else {
      updatedList = [...sessions, sessionToSave];
    }

    setSessions(updatedList);
    setIsEditingSession(false);
    setEditingSessionData(null);
    toast.success("Sessão atualizada na curadoria! Clique em 'Salvar Configurações' para publicar.");
  };

  const handleResetDefaultSessions = () => {
    if (!confirm("Deseja restaurar as sessões de louvor para o padrão oficial?")) return;
    setSessions(READY_SESSIONS);
    toast.success("Sessões restauradas para o padrão oficial.");
  };

  // Adicionar faixa encontrada diretamente como query de uma sessão
  const handleAddTrackToSession = (track: MusicTrack, targetSessionId: string) => {
    if (!targetSessionId) {
      toast.error("Selecione uma sessão de destino.");
      return;
    }

    const target = sessions.find(s => s.id === targetSessionId);
    if (!target) return;

    const queryToAdd = `${track.artist} ${track.title}`.trim();
    if (target.queries.includes(queryToAdd)) {
      toast.info("Este louvor já está na sessão.");
      return;
    }

    const updatedSessions = sessions.map(s => {
      if (s.id === targetSessionId) {
        return {
          ...s,
          queries: [...s.queries, queryToAdd],
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    toast.success(`"${track.title}" adicionado à sessão "${target.title}"!`);
  };

  // Filtragem da lista de moderação
  const filteredModeratedTracks = moderatedTracks.filter(item => {
    if (trackSourceFilter !== "all" && item.source_type !== trackSourceFilter) return false;
    if (trackStatusFilter === "suspect" && !item.isSecularSuspect) return false;
    if (trackStatusFilter === "banned" && item.user?.verification_label !== "BANIDO") return false;

    if (trackSearchFilter.trim()) {
      const q = trackSearchFilter.toLowerCase();
      const matchTrack = item.title.toLowerCase().includes(q) || item.artist.toLowerCase().includes(q);
      const matchUser = item.user?.full_name?.toLowerCase().includes(q) || item.user?.username?.toLowerCase().includes(q);
      return matchTrack || matchUser;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Controle & Moderação do FéMusic
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Headphones className="h-3.5 w-3.5" />
              v1.8.5 Guard & Moderation
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Audite músicas baixadas e reproduzidas no app, identifique usuários com músicas seculares, envie advertências, aplique bloqueios temporários ou banimento.
          </p>
        </div>

        {/* Botões de Ação do Header */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/music"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <Music className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Abrir FéMusic Web</span>
          </Link>

          <button
            onClick={() => { loadAllData(); loadModeratedTracks(); }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? "Salvando..." : "Salvar Configurações"}</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE TELEMETRIA REAL DO SUPABASE (ZERO MOCKS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Playlists Criadas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Playlists Criadas</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ListMusic className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.totalPlaylists.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">pela comunidade</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Coleções salvas</span>
            <span className="text-emerald-500 font-medium">Supabase Cloud</span>
          </div>
        </div>

        {/* Card 2: Faixas em Playlists */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Louvores Guardados</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Music className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.totalPlaylistTracks.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">faixas indexadas</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Biblioteca ativa</span>
            <span className="text-blue-500 font-medium">Tracks</span>
          </div>
        </div>

        {/* Card 3: Compartilhamentos no Feed */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Louvores no Feed</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.totalMusicShares.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">reposts musicais</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Posts interativos</span>
            <span className="text-purple-500 font-medium">Comunidade</span>
          </div>
        </div>

        {/* Card 4: Sessões Prontas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sessões Oficiais</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {sessions.length}
            </span>
            <span className="text-[11px] text-muted-foreground">temas ativos</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Curadoria do Admin</span>
            <span className="text-amber-500 font-medium">Pronto para Ouvir</span>
          </div>
        </div>
      </div>

      {/* ─── 🛡️ CENTRAL DE AUDITORIA & MODERAÇÃO DE MÚSICAS BAIXADAS E USUÁRIOS ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">Auditoria & Moderação de Músicas no App</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Monitore todas as músicas baixadas, playlists salvas e posts de áudio. Aplique advertências, bloqueio temporário ou banimento a usuários com músicas seculares.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded">
            {filteredModeratedTracks.length} registros auditados
          </span>
        </div>

        {/* Filtros e Busca de Moderação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por música, cantor, nome de usuário ou @username..."
              value={trackSearchFilter}
              onChange={(e) => setTrackSearchFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={trackSourceFilter}
              onChange={(e) => setTrackSourceFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
            >
              <option value="all">Origem: Todas</option>
              <option value="playlist">Em Playlists</option>
              <option value="feed_post">No Feed</option>
              <option value="audio_cache">Cache do Servidor</option>
            </select>

            <select
              value={trackStatusFilter}
              onChange={(e) => setTrackStatusFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
            >
              <option value="all">Status: Todos</option>
              <option value="suspect">⚠️ Suspeita Secular</option>
              <option value="banned">🚫 Usuários Banidos</option>
            </select>
          </div>
        </div>

        {/* Tabela de Moderação */}
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3">Música / Faixa</th>
                <th className="p-3">Usuário Responsável</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Classificação</th>
                <th className="p-3 text-right">Ações Disciplinares</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingTracks ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Carregando faixas para moderação...
                  </td>
                </tr>
              ) : filteredModeratedTracks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Nenhuma música encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredModeratedTracks.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    {/* Coluna 1: Faixa */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black">
                          {item.cover ? (
                            <img src={item.cover} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-5 h-5 text-white/50 m-2.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate max-w-[200px]">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.artist}</p>
                          <a
                            href={`https://youtube.com/watch?v=${item.provider_track_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-whatsapp-teal hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            <span>Ouvir</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Coluna 2: Usuário Responsável */}
                    <td className="p-3">
                      {item.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0 border border-border flex items-center justify-center">
                            {item.user.avatar_url ? (
                              <img src={item.user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-[10px] uppercase">
                                {(item.user.full_name || item.user.username || 'U')[0]}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-bold text-foreground truncate">{item.user.full_name || item.user.username}</p>
                              {item.user.verification_label === "BANIDO" && (
                                <span className="text-[9px] font-bold bg-red-500/20 text-red-500 px-1 rounded">BANIDO</span>
                              )}
                              {item.user.verification_label?.startsWith("SUSPENSO") && (
                                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-500 px-1 rounded">SUSPENSO</span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">@{item.user.username || 'membro'}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Sistema / Cache Geral</span>
                      )}
                    </td>

                    {/* Coluna 3: Origem */}
                    <td className="p-3">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        item.source_type === "playlist" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        item.source_type === "feed_post" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                        item.source_type === "audio_cache" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      )}>
                        {item.source_type === "playlist" ? "Playlist" : item.source_type === "feed_post" ? "Feed Post" : "Cache Servidor"}
                      </span>
                    </td>

                    {/* Coluna 4: Classificação */}
                    <td className="p-3">
                      {item.isSecularSuspect ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" />
                          Suspeita Secular
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3" />
                          Louvor Cristão
                        </span>
                      )}
                    </td>

                    {/* Coluna 5: Ações Disciplinares */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.user && (
                          <>
                            {/* Notificar / Advertir */}
                            <button
                              onClick={() => {
                                setSelectedTrackForAction(item);
                                setNotifyModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-muted hover:bg-amber-500/20 hover:text-amber-500 text-muted-foreground transition-colors"
                              title="Enviar Notificação de Advertência"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                            </button>

                            {/* Bloquear Temporário */}
                            <button
                              onClick={() => {
                                setSelectedTrackForAction(item);
                                setSuspendModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-muted hover:bg-orange-500/20 hover:text-orange-500 text-muted-foreground transition-colors"
                              title="Bloquear Usuário por Tempo (24h / 7d / 30d)"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            {/* Banir Usuário */}
                            <button
                              onClick={() => {
                                setSelectedTrackForAction(item);
                                setBanModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-muted hover:bg-red-500/20 hover:text-red-500 text-muted-foreground transition-colors"
                              title="Banir Usuário Permanentemente"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Purgar Música */}
                        <button
                          onClick={() => handlePurgeTrack(item)}
                          className="p-1.5 rounded-lg bg-muted hover:bg-red-500/20 hover:text-red-500 text-muted-foreground transition-colors"
                          title="Purgar Música da Plataforma"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── CONTROLES DE RECURSOS DO FÉMUSIC (TOGGLES EM TEMPO REAL) ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Parâmetros & Recursos Globais do FéMusic</h3>
            <p className="text-xs text-muted-foreground">Defina a visibilidade do player, reprodução contínua e permissões de playlists</p>
          </div>
          <span className="text-[10px] font-bold text-whatsapp-teal bg-whatsapp-teal/10 px-2 py-0.5 rounded">
            Tempo Real (WebSocket)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Toggle 1: Visibilidade no Feed */}
          <div 
            onClick={() => setConfig({ ...config, enable_femusic_feed: !config.enable_femusic_feed })}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Music className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">FéMusic no Menu Principal</p>
                <p className="text-[11px] text-muted-foreground">Exibe o atalho do FéMusic na barra de navegação da rede social.</p>
              </div>
            </div>
            <span className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
              config.enable_femusic_feed ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "inline-block size-3.5 rounded-full bg-white transition-transform",
                config.enable_femusic_feed ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </div>

          {/* Toggle 2: Autoplay de Próxima Música */}
          <div 
            onClick={() => setConfig({ ...config, enable_autoplay: !config.enable_autoplay })}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Volume2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Autoplay de Próximo Louvor</p>
                <p className="text-[11px] text-muted-foreground">Toca automaticamente a próxima faixa recomendada ao fim de cada música.</p>
              </div>
            </div>
            <span className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
              config.enable_autoplay ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "inline-block size-3.5 rounded-full bg-white transition-transform",
                config.enable_autoplay ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </div>

          {/* Toggle 3: Playlists Públicas */}
          <div 
            onClick={() => setConfig({ ...config, allow_public_playlists: !config.allow_public_playlists })}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ListMusic className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Playlists Públicas da Comunidade</p>
                <p className="text-[11px] text-muted-foreground">Permite que membros compartilhem e descubram coleções criadas por outros irmãos.</p>
              </div>
            </div>
            <span className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
              config.allow_public_playlists ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "inline-block size-3.5 rounded-full bg-white transition-transform",
                config.allow_public_playlists ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </div>

          {/* Toggle 4: Compartilhamento no Feed */}
          <div 
            onClick={() => setConfig({ ...config, enable_music_feed_share: !config.enable_music_feed_share })}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Card de Louvor no Feed Principal</p>
                <p className="text-[11px] text-muted-foreground">Habilita botão 'Recomendar no Feed' dentro do player para gerar post de louvor.</p>
              </div>
            </div>
            <span className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
              config.enable_music_feed_share ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "inline-block size-3.5 rounded-full bg-white transition-transform",
                config.enable_music_feed_share ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </div>
        </div>
      </div>

      {/* ─── CURADORIA DE SESSÕES PRONTAS DE LOUVOR (GERENCIADOR DO ADMIN) ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Sessões Temáticas Oficiais (Curadoria)</h3>
            <p className="text-xs text-muted-foreground">Sessões rápidas de louvor exibidas no topo do FéMusic com busca dinâmica</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaultSessions}
              className="text-xs text-muted-foreground hover:text-foreground underline px-2 py-1"
            >
              Restaurar Padrão
            </button>
            <button
              onClick={handleOpenAddSession}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-whatsapp-teal text-white text-xs font-bold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova Sessão</span>
            </button>
          </div>
        </div>

        {/* Grid de Cards de Sessões */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "relative rounded-2xl p-4 overflow-hidden border border-border bg-gradient-to-br transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between min-h-[160px]",
                session.color || "from-purple-600 to-indigo-700"
              )}
            >
              <div className="relative z-10 flex items-start justify-between">
                <span className="text-2xl">{session.emoji}</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full text-white/90 border border-white/10">
                  {session.durationLabel}
                </span>
              </div>

              <div className="relative z-10 my-2">
                <h4 className="text-base font-bold text-white leading-tight drop-shadow-sm">{session.title}</h4>
                <p className="text-xs text-white/80 line-clamp-2 mt-0.5">{session.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {session.queries.slice(0, 2).map((q, idx) => (
                    <span key={idx} className="text-[9px] bg-black/20 text-white/90 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                      {q}
                    </span>
                  ))}
                  {session.queries.length > 2 && (
                    <span className="text-[9px] bg-black/20 text-white/90 px-1.5 py-0.5 rounded">
                      +{session.queries.length - 2}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2 mt-1">
                <span className="text-[10px] text-white/60">{session.queries.length} termos</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditSession(session)}
                    className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors"
                    title="Editar Sessão"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-1.5 rounded-lg bg-black/30 hover:bg-red-500/80 text-white transition-colors"
                    title="Excluir Sessão"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ESTÚDIO DE TESTE & PRÉ-ESCUTA DE LOUVORES DO YOUTUBE COM PLAYER REAL ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Estúdio de Busca & Pré-escuta de Louvores</h3>
            <p className="text-xs text-muted-foreground">Teste os resultados retornados pelo motor de busca e pré-escute antes de associar a uma sessão</p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded font-mono">
            YouTube Scraper SSR
          </span>
        </div>

        {/* Barra de Busca de Músicas */}
        <form onSubmit={handleSearchMusic} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar louvor por nome, cantor ou tema (ex: Gabriela Rocha Lugar Secreto, Fernandinho)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-3 text-xs sm:text-sm text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="h-10 px-5 rounded-lg bg-whatsapp-teal text-white text-xs font-bold hover:bg-whatsapp-tealLight transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <Search className={cn("h-3.5 w-3.5", searching && "animate-spin")} />
            <span>{searching ? "Buscando..." : "Buscar Louvor"}</span>
          </button>
        </form>

        {/* Player Flutuante / Embutido para Pré-Escuta Real */}
        {currentPlayingTrack && (
          <div className="p-3.5 rounded-xl border border-whatsapp-teal/30 bg-whatsapp-teal/5 flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border bg-black">
                {currentPlayingTrack.cover ? (
                  <img src={currentPlayingTrack.cover} className="w-full h-full object-cover" alt="" />
                ) : (
                  <Music className="w-6 h-6 text-white m-3" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{currentPlayingTrack.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{currentPlayingTrack.artist}</p>
                <span className="text-[10px] text-whatsapp-teal font-medium flex items-center gap-1 mt-0.5">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  Reproduzindo áudio no estúdio de teste
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://www.youtube.com/watch?v=${currentPlayingTrack.providerTrackId || currentPlayingTrack.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-red-700 transition-colors"
              >
                <span>Assistir no YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => {
                  setCurrentPlayingTrack(null);
                  setIsPlaying(false);
                }}
                className="h-8 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
              >
                Parar
              </button>
            </div>
          </div>
        )}

        {/* Resultados da Busca */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {searchResults.map((track) => (
              <div
                key={track.id}
                className="flex flex-col justify-between p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-black">
                    {track.cover ? (
                      <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/40">
                        <Music className="w-6 h-6" />
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (currentPlayingTrack?.id === track.id) {
                          setIsPlaying(!isPlaying);
                        } else {
                          setCurrentPlayingTrack(track);
                          setIsPlaying(true);
                        }
                      }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      title="Pré-escutar louvor"
                    >
                      {currentPlayingTrack?.id === track.id && isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{track.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          const dur = track.duration || 0;
                          return `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, '0')}`;
                        })()}
                      </span>
                      <a
                        href={`https://youtube.com/watch?v=${track.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-whatsapp-teal hover:underline flex items-center gap-0.5"
                      >
                        <span>YouTube</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Ação rápida: Adicionar a uma Sessão do Admin */}
                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <select
                    value={selectedSessionForAdd}
                    onChange={(e) => setSelectedSessionForAdd(e.target.value)}
                    className="h-7 w-full rounded-md border border-border bg-muted/40 px-2 text-[10px] text-foreground outline-none"
                  >
                    <option value="">Selecione uma sessão...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.emoji} {s.title}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleAddTrackToSession(track, selectedSessionForAdd)}
                    disabled={!selectedSessionForAdd}
                    className="h-7 px-2.5 rounded-md bg-whatsapp-teal text-white text-[10px] font-bold hover:bg-whatsapp-tealLight disabled:opacity-40 shrink-0 flex items-center gap-1"
                    title="Adicionar à Sessão Selecionada"
                  >
                    <ListPlus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: NOTIFICAR / ADVERTIR USUÁRIO (MÚSICA SECULAR) ─── */}
      {notifyModalOpen && selectedTrackForAction?.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">Enviar Advertência ao Usuário</h3>
              </div>
              <button onClick={() => setNotifyModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <p className="font-bold text-foreground">Usuário: @{selectedTrackForAction.user.username}</p>
              <p className="text-muted-foreground">Música auditada: <span className="font-semibold text-foreground">"{selectedTrackForAction.title}"</span> ({selectedTrackForAction.artist})</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Mensagem de Notificação</label>
              <textarea
                value={customNotifyMessage}
                onChange={(e) => setCustomNotifyMessage(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setNotifyModalOpen(false)}
                className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendWarningNotification}
                className="h-9 px-5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-sm"
              >
                Enviar Advertência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: SUSPENDER USUÁRIO TEMPORARIAMENTE ─── */}
      {suspendModalOpen && selectedTrackForAction?.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-foreground">Bloqueio Temporário</h3>
              </div>
              <button onClick={() => setSuspendModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <p className="text-xs text-muted-foreground">
              O usuário <strong className="text-foreground">@{selectedTrackForAction.user.username}</strong> terá o acesso suspenso temporariamente e receberá um aviso disciplinar.
            </p>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Período de Bloqueio</label>
              <select
                value={suspendDurationDays}
                onChange={(e) => setSuspendDurationDays(parseInt(e.target.value, 10))}
                className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
              >
                <option value={1}>24 Horas (1 dia)</option>
                <option value={7}>7 Dias (1 semana)</option>
                <option value={15}>15 Dias</option>
                <option value={30}>30 Dias (1 mês)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSuspendUser}
                className="h-9 px-5 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-sm"
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: BANIR USUÁRIO PERMANENTEMENTE ─── */}
      {banModalOpen && selectedTrackForAction?.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-red-500">Banir Usuário da Plataforma</h3>
              </div>
              <button onClick={() => setBanModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-1">
              <p className="font-bold text-red-600 dark:text-red-400">Atenção: Ação Definitiva</p>
              <p className="text-muted-foreground">
                O usuário <strong className="text-foreground">@{selectedTrackForAction.user.username}</strong> perderá o acesso a todas as funcionalidades do FéConecta permanentemente por violação das diretrizes espirituais.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setBanModalOpen(false)}
                className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleBanUserPermanent}
                className="h-9 px-5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm"
              >
                Banir Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE ADICIONAR / EDITAR SESSÃO TEMÁTICA ─── */}
      {isEditingSession && editingSessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {editingSessionData.title ? "Editar Sessão de Louvor" : "Nova Sessão de Louvor"}
              </h3>
              <button
                onClick={() => setIsEditingSession(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">Título da Sessão</label>
                  <input
                    type="text"
                    value={editingSessionData.title}
                    onChange={(e) => setEditingSessionData({ ...editingSessionData, title: e.target.value })}
                    placeholder="Ex: Adoração Profunda"
                    className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Emoji</label>
                  <input
                    type="text"
                    value={editingSessionData.emoji}
                    onChange={(e) => setEditingSessionData({ ...editingSessionData, emoji: e.target.value })}
                    placeholder="Ex: 🙏"
                    className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-center text-base outline-none focus:ring-1 focus:ring-whatsapp-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Descrição Curta</label>
                <input
                  type="text"
                  value={editingSessionData.description}
                  onChange={(e) => setEditingSessionData({ ...editingSessionData, description: e.target.value })}
                  placeholder="Ex: Músicas para entrar na presença de Deus"
                  className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Duração Estimada</label>
                  <input
                    type="text"
                    value={editingSessionData.durationLabel}
                    onChange={(e) => setEditingSessionData({ ...editingSessionData, durationLabel: e.target.value })}
                    placeholder="Ex: 30 min, 1h"
                    className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Gradiente de Cor</label>
                  <select
                    value={editingSessionData.color}
                    onChange={(e) => setEditingSessionData({ ...editingSessionData, color: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
                  >
                    <option value="from-purple-600 to-indigo-700">Roxo / Índigo (Adoração)</option>
                    <option value="from-red-700 to-orange-600">Vermelho / Laranja (Guerra)</option>
                    <option value="from-slate-700 to-blue-900">Azul Noite (Madrugada)</option>
                    <option value="from-amber-500 to-yellow-600">Dourado (Gratidão)</option>
                    <option value="from-emerald-600 to-teal-800">Verde Esmeralda (Paz)</option>
                    <option value="from-rose-600 to-pink-700">Rosa / Coral (Jovens)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">Termos de Busca no YouTube (1 por linha)</label>
                  <button
                    type="button"
                    onClick={() => setEditingSessionData({
                      ...editingSessionData,
                      queries: [...editingSessionData.queries, ""]
                    })}
                    className="text-[11px] text-whatsapp-teal hover:underline font-bold"
                  >
                    + Adicionar Termo
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {editingSessionData.queries.map((query, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                          const updated = [...editingSessionData.queries];
                          updated[index] = e.target.value;
                          setEditingSessionData({ ...editingSessionData, queries: updated });
                        }}
                        placeholder={`Ex: Cantor / Louvor ${index + 1}`}
                        className="h-8 w-full rounded-md border border-border bg-muted/30 px-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
                      />
                      {editingSessionData.queries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingSessionData.queries.filter((_, i) => i !== index);
                            setEditingSessionData({ ...editingSessionData, queries: updated });
                          }}
                          className="text-red-500 hover:text-red-600 text-xs px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditingSession(false)}
                className="h-9 px-4 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSessionModal}
                className="h-9 px-5 rounded-lg bg-whatsapp-teal text-white text-xs font-bold hover:bg-whatsapp-tealLight shadow-sm"
              >
                Salvar Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
