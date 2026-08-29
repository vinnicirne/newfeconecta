import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { handleApiError } from "@/lib/api-error-handler";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const user = await requireAuth(request).catch(() => null);
  if (!user) throw Object.assign(new Error("Não autorizado"), { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin" || profile?.role === "moderator";
  if (!isAdmin) {
    throw Object.assign(new Error("Acesso negado: requer permissão de admin"), { status: 403 });
  }

  return user;
}

/**
 * GET /api/admin/refunds
 * Lista todas as solicitações de reembolso para moderação do admin.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = db
      .from("refund_requests")
      .select("*, wallets(id, partner_id, saldo_disponivel)")
      .order("solicitado_em", { ascending: false });

    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar reembolsos: ${error.message}`);
    }

    return NextResponse.json({ refunds: data ?? [] });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    return handleApiError(error, "GET /api/admin/refunds");
  }
}
