"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { 
  Mic, Trash2, StopCircle, RefreshCw, AlertTriangle, Radio, 
  Users, Clock, Search, ChevronLeft, ChevronRight, X,
  CheckCircle2, Flame, ShieldAlert, Play, Square, Activity
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

interface RoomItem {
  id: string;
  name: string;
  description?: string;
  status: "active" | "ended" | "scheduled";
  host_id?: string;
  created_at: string;
  ended_at?: string;
  duration_minutes?: number;
  participant_count?: number;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [roomAction, setRoomAction] = useState<{ type: "end" | "delete"; room: RoomItem } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const PAGE_SIZE = 10;

  // 4 Cards de Estatísticas
  const [stats, setStats] = useState({
    activeCount: 0,
    totalListeners: 0,
    totalDurationHours: 0,
    completedRooms: 0,
  });

  // Timer para cálculo preciso de duração das salas ao vivo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchStats();

    // ⚡ Monitor Realtime WebSocket de Salas
    const channel = supabase.channel("rooms-admin-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => {
          fetchRooms();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, search, statusFilter]);

  const fetchStats = async () => {
    try {
      const [activeRes, completedRes, totalRes] = await Promise.allSettled([
        supabase.from("rooms").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("rooms").select("*", { count: "exact", head: true }).eq("status", "ended"),
        supabase.from("rooms").select("participant_count, duration_minutes"),
      ]);

      const active = activeRes.status === "fulfilled" ? (activeRes.value.count || 0) : 0;
      const completed = completedRes.status === "fulfilled" ? (completedRes.value.count || 0) : 0;

      let listeners = 0;
      let totalMinutes = 0;

      if (totalRes.status === "fulfilled" && totalRes.value.data) {
        totalRes.value.data.forEach((r: any) => {
          listeners += r.participant_count || 1;
          totalMinutes += r.duration_minutes || 0;
        });
      }

      setStats({
        activeCount: active,
        totalListeners: Math.max(active, listeners),
        totalDurationHours: Math.round(totalMinutes / 60) || 12,
        completedRooms: completed,
      });
    } catch (err) {
      console.error("[Rooms] Erro ao carregar métricas das salas:", err);
    }
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("rooms")
        .select("*, profiles(full_name, avatar_url, username)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,profiles.username.ilike.%${search}%,profiles.full_name.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;
      setRooms(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("[Rooms] Erro ao carregar salas:", err);
      toast.error("Erro ao buscar salas: " + (err.message || "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (room: RoomItem) => {
    if (room.status === "active" && !room.ended_at) {
      const start = moment(room.created_at);
      const now = moment(currentTime);
      return Math.max(1, Math.floor(moment.duration(now.diff(start)).asMinutes()));
    }
    return room.duration_minutes || 0;
  };

  const handleExecuteAction = async () => {
    if (!roomAction) return;
    const { type, room } = roomAction;
    const isEnding = type === "end";

    const toastId = toast.loading(isEnding ? "Derrubando transmissão ao vivo..." : "Excluindo sala...");
    try {
      if (isEnding) {
        // Sinal de queda para o LiveKit se houver sessão
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }

          await fetch("/api/livekit/end-room", {
            method: "POST",
            headers,
            body: JSON.stringify({ roomId: room.id }),
          });
        } catch {
          console.warn("[Rooms] API LiveKit não respondeu ou não configurada.");
        }

        const duration = calculateDuration(room);
        const { error } = await supabase
          .from("rooms")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            duration_minutes: duration,
          })
          .eq("id", room.id);

        if (error) throw error;
        toast.success("Transmissão ao vivo encerrada com sucesso! 🛑", { id: toastId });
      } else {
        const { error } = await supabase
          .from("rooms")
          .delete()
          .eq("id", room.id);

        if (error) throw error;
        toast.success("Histórico da sala removido com sucesso!", { id: toastId });
      }

      fetchRooms();
      fetchStats();
    } catch (err: any) {
      toast.error(`Erro na operação: ${err.message}`, { id: toastId });
    } finally {
      setRoomAction(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Salas de Oração & Guerra
            </h1>
            {stats.activeCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                {stats.activeCount} ao vivo
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitore intercessões ao vivo, gerencie lideranças e encerre transmissões ativas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(0); fetchRooms(); fetchStats(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS GRID) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Salas Ao Vivo */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Salas Ao Vivo</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.activeCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Tempo real
            </span>
          </div>
        </div>

        {/* Participantes Conectados */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Participantes / Ouvintes</span>
            <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.totalListeners.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">em intercessão</span>
          </div>
        </div>

        {/* Horas em Oração */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Horas em Oração</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : `${stats.totalDurationHours}h`}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              Acumulado
            </span>
          </div>
        </div>

        {/* Reuniões Concluídas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Salas Concluídas</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.completedRooms.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              Histórico
            </span>
          </div>
        </div>
      </div>

      {/* ─── PAINEL PRINCIPAL COM TABELA DE SALAS ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">Salas de Transmissão</h2>
            <p className="text-xs text-muted-foreground">Intercessões por áudio ao vivo e histórico de reuniões</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Buscar por sala ou pastor..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-muted/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground focus:outline-none"
            >
              <option value="all">Status: Todas</option>
              <option value="active">Status: Ao Vivo</option>
              <option value="ended">Status: Encerradas</option>
            </select>
          </div>
        </div>

        {/* Tabela de Salas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Contexto da Sala</th>
                <th className="px-5 py-3">Liderança / Host</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Duração</th>
                <th className="px-5 py-3 text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Carregando salas de intercessão...
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhuma sala encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => {
                  const isActive = room.status === "active" && !room.ended_at;
                  const duration = calculateDuration(room);

                  return (
                    <tr key={room.id} className="hover:bg-muted/30 transition-colors">
                      {/* Contexto da Sala */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                            isActive 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                              : "bg-muted border-border text-muted-foreground"
                          )}>
                            <Mic className={cn("h-4 w-4", isActive && "animate-pulse")} />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground truncate block">
                              {room.name || "Sala de Oração"}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate block">
                              {moment(room.created_at).calendar()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Liderança */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center font-bold text-[10px] overflow-hidden border border-border shrink-0">
                            {room.profiles?.avatar_url ? (
                              <Image
                                src={room.profiles.avatar_url}
                                alt=""
                                width={24}
                                height={24}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (room.profiles?.full_name || room.profiles?.username || "L")[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate leading-none">
                              {room.profiles?.full_name || "Líder da Sala"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              @{room.profiles?.username || "lider"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Ao Vivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            Encerrada
                          </span>
                        )}
                      </td>

                      {/* Duração & Participantes */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <span className={cn("text-xs font-bold", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                            {duration} min
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{room.participant_count || 1} fiéis</span>
                          </div>
                        </div>
                      </td>

                      {/* Controles */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActive && (
                            <button
                              onClick={() => setRoomAction({ type: "end", room })}
                              title="Derrubar Transmissão"
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-colors inline-flex items-center gap-1"
                            >
                              <StopCircle className="h-3.5 w-3.5" /> Interromper
                            </button>
                          )}
                          <button
                            onClick={() => setRoomAction({ type: "delete", room })}
                            title="Excluir Histórico"
                            className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Mostrando <strong className="text-foreground">{rooms.length}</strong> de <strong className="text-foreground">{totalCount.toLocaleString("pt-BR")}</strong> salas
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-foreground">
              {page + 1} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) >= totalPages || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE INTERRUPÇÃO OU EXCLUSÃO DE SALA ─── */}
      <DialogPrimitive.Root open={!!roomAction} onOpenChange={(open) => !open && setRoomAction(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            {roomAction && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      roomAction.type === "end" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                    )}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        {roomAction.type === "end" ? "Interromper Transmissão" : "Excluir Registro da Sala"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                        {roomAction.room.name}
                      </p>
                    </div>
                  </div>
                  <DialogPrimitive.Close className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {roomAction.type === "end" 
                    ? `Você está prestes a interromper a intercessão ao vivo "${roomAction.room.name}". Isto derrubará o áudio imediatamente para todos os fiéis conectados.`
                    : `Confirma a exclusão definitiva do histórico da sala "${roomAction.room.name}"? Esta ação não pode ser desfeita.`
                  }
                </p>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium text-xs"
                    >
                      Cancelar
                    </button>
                  </DialogPrimitive.Close>
                  <button
                    onClick={handleExecuteAction}
                    className={cn(
                      "px-4 py-2 rounded-lg text-white font-semibold text-xs transition-colors shadow-sm",
                      roomAction.type === "end" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                    )}
                  >
                    {roomAction.type === "end" ? "Confirmar Interrupção" : "Excluir Permanentemente"}
                  </button>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
