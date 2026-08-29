import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { handleApiError } from "@/lib/api-error-handler";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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

const rejectSchema = z.object({
  motivo: z.string().max(500).optional(),
});

/**
 * POST /api/admin/refunds/[id]/reject
 * Recusa solicitação de reembolso. O saldo disponível permanece intocado.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    const motivo = parsed.success ? parsed.data.motivo : undefined;

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: updated, error } = await db
      .from("refund_requests")
      .update({
        status: "rejeitado",
        motivo_rejeicao: motivo ?? null,
        processado_em: new Date().toISOString(),
        admin_id: admin.id,
      })
      .eq("id", params.id)
      .select("id, status, motivo_rejeicao, processado_em")
      .single();

    if (error || !updated) {
      throw new Error(`Erro ao rejeitar reembolso: ${error?.message}`);
    }

    return NextResponse.json({
      ...updated,
      mensagem: "Solicitação de reembolso rejeitada. O saldo permanece disponível na carteira do parceiro.",
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    return handleApiError(error, `POST /api/admin/refunds/${params.id}/reject`);
  }
}
