import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { CampaignService } from "@/domain/ads/campaign.service";
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
 * POST /api/admin/campaigns/[id]/reject
 *
 * Admin reprova campanha.
 * NÃO chama Mercado Pago.
 * Se havia débito prévio, devolve para saldo disponível via ledger.
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

    const service = new CampaignService();
    const campaign = await service.rejectCampaign(params.id, admin.id, motivo);

    return NextResponse.json({
      ...campaign,
      mensagem: "Campanha reprovada. Saldo (se havia) devolvido à carteira do parceiro.",
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    return handleApiError(error, `POST /api/admin/campaigns/${params.id}/reject`);
  }
}
