// =============================================================================
// FéConecta Ads — Formatters & Client API Helpers
// =============================================================================

import { supabase } from "@/lib/supabase";

/**
 * Formata centavos em Reais (pt-BR).
 * Exemplo: 5000 -> "R$ 50,00"
 */
export function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * Formata data ISO para pt-BR (ex: "28/08/2026").
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("pt-BR").format(d);
  } catch {
    return isoString;
  }
}

/**
 * Formata data e hora para pt-BR.
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Helper para chamadas fetch autenticadas com o JWT do Supabase.
 */
export async function adsApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token: string | undefined;

  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;

    if (!token && typeof window !== "undefined") {
      const stored = localStorage.getItem("fc-auth-token") || localStorage.getItem("supabase.auth.token");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed);
        } catch {
          token = stored;
        }
      }
    }
  } catch {}

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    cache: "no-store",
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Erro ${response.status}: Falha na requisição`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}
