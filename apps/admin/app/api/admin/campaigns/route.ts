import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { CampaignService } from "@/domain/ads/campaign.service";
import { handleApiError } from "@/lib/api-error-handler";
import { createClient } from "@supabase/supabase-js";
import { CampaignStatus } from "@/domain/ads/types";

export const dynamic = "force-dynamic";

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin(request: Request) {
  const user = await requireAuth(request).catch(() => null);
  if (!user) throw Object.assign(new Error("Não autorizado"), { status: 401 });

  const { data: profile } = await getAdminDb()
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
 * GET /api/admin/campaigns
 * Lista todas as campanhas com filtros e paginação para o painel de moderação.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CampaignStatus | null;
    const partner_id = searchParams.get("partner_id") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    const service = new CampaignService();
    const result = await service.listAll({
      status: status ?? undefined,
      partner_id,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    return handleApiError(error, "GET /api/admin/campaigns");
  }
}
