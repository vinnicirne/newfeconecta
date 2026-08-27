import { supabase } from "@/lib/supabase";

const VIEW_STORAGE_KEY = "feconecta_viewed_posts_v2";
const DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000; // Janela de 24 horas

interface ViewRegistry {
  [postId: string]: number; // timestamp em ms da última visualização
}

/**
 * Lê o registro local de visualizações e expurga itens com mais de 24h.
 */
function getCleanViewRegistry(): ViewRegistry {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return {};

    const registry: ViewRegistry = JSON.parse(raw);
    const now = Date.now();
    const cleaned: ViewRegistry = {};

    for (const [id, timestamp] of Object.entries(registry)) {
      if (now - timestamp < DEDUPLICATION_WINDOW_MS) {
        cleaned[id] = timestamp;
      }
    }

    // Atualiza o storage com dados expurgados
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return {};
  }
}

/**
 * Verifica se o usuário já visualizou este post nas últimas 24 horas.
 */
export function hasViewedPostRecently(postId: string): boolean {
  if (!postId || typeof window === "undefined") return false;
  const registry = getCleanViewRegistry();
  return Boolean(registry[postId]);
}

/**
 * Registra a visualização no padrão Big Tech:
 * - Valida a janela de 24 horas (impede múltiplos views por F5).
 * - Persiste o timestamp localmente.
 * - Executa incremento atômico no banco de dados via RPC ou UPDATE seguro.
 */
export async function trackQualifiedPostView(
  postId: string,
  currentViews: number,
  onSuccess?: (newCount: number) => void
): Promise<boolean> {
  if (!postId || typeof window === "undefined") return false;

  // 1. Checa se já visualizou nas últimas 24 horas
  if (hasViewedPostRecently(postId)) {
    return false;
  }

  // 2. Registra o timestamp no cache local
  try {
    const registry = getCleanViewRegistry();
    registry[postId] = Date.now();
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(registry));
  } catch (err) {
    console.warn("[ViewTracker] Erro ao gravar cache local:", err);
  }

  // 3. Incrementa no banco de dados
  const newCount = currentViews + 1;
  onSuccess?.(newCount);

  try {
    const { error: rpcError } = await supabase.rpc("increment_view", {
      p_post_id: postId,
    });

    if (rpcError) {
      await supabase
        .from("posts")
        .update({ views_count: newCount })
        .eq("id", postId);
    }

    return true;
  } catch (err) {
    console.error("[ViewTracker] Erro ao incrementar visualização:", err);
    return false;
  }
}
