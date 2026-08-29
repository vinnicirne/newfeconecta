import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { CampaignService } from "@/domain/ads/campaign.service";
import { handleApiError } from "@/lib/api-error-handler";
import { CreateCampaignDto, CampaignStatus } from "@/domain/ads/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCampaignSchema = z.object({
  nome: z.string().min(3, "Nome deve ter ao menos 3 caracteres").max(100),
  formato: z.enum(["feed", "stories", "banner"]),
  objetivo: z.enum(["alcance", "cliques", "conversoes"]),
  orcamento: z.number().int().min(500, "Orçamento mínimo é R$ 5,00 (500 centavos)"),
  periodo_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  periodo_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  publico: z.object({
    regioes: z.array(z.string()).optional(),
    interesses: z.array(z.string()).optional(),
    denominacoes: z.array(z.string()).optional(),
  }).optional(),
  criativo_url: z.string().url().optional(),
  criativo_tipo: z.enum(["imagem", "video"]).optional(),
  call_to_action: z.string().max(1000).optional(),
  texto: z.string().max(3000).optional(),
});

/**
 * POST /api/campaigns
 * Parceiro cria campanha em status "pendente" — SEM debitar saldo.
 * partner_id é sempre extraído do token JWT — nunca do body.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const dto = parsed.data as CreateCampaignDto;
    const service = new CampaignService();

    // Valida período
    if (dto.periodo_fim < dto.periodo_inicio) {
      return NextResponse.json(
        { error: "periodo_fim deve ser maior ou igual a periodo_inicio" },
        { status: 400 }
      );
    }

    const campaign = await service.createCampaign(user.id, dto);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/campaigns");
  }
}

/**
 * GET /api/campaigns
 * Lista campanhas do parceiro autenticado, com filtro opcional de status.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CampaignStatus | null;

    const service = new CampaignService();
    const campaigns = await service.listByPartner(user.id, status ? { status } : undefined);

    return NextResponse.json({ campaigns, total: campaigns.length });
  } catch (error) {
    return handleApiError(error, "GET /api/campaigns");
  }
}
