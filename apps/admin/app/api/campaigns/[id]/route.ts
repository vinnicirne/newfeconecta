import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { CampaignService } from "@/domain/ads/campaign.service";
import { handleApiError } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/campaigns/[id]
 * Detalhe de campanha do parceiro autenticado.
 * Garante que o parceiro só vê a própria campanha.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const service = new CampaignService();
    const campaign = await service.getCampaignById(params.id);

    // Garante que o parceiro só vê sua própria campanha
    if (campaign.partner_id !== user.id) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    return handleApiError(error, `GET /api/campaigns/${params.id}`);
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Atualiza campos editáveis da campanha (link de destino, CTA, texto, nome).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const service = new CampaignService();
    const campaign = await service.getCampaignById(params.id);

    // Permite que o próprio parceiro ou um administrador edite
    if (campaign.partner_id !== user.id) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
    }

    const { 
      nome, 
      texto, 
      call_to_action, 
      criativo_url, 
      criativo_tipo, 
      formato, 
      objetivo, 
      acao_conversao,
      periodo_inicio, 
      periodo_fim, 
      publico 
    } = body;

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (texto !== undefined) updateData.texto = texto;
    if (call_to_action !== undefined) updateData.call_to_action = call_to_action;
    if (criativo_url !== undefined) updateData.criativo_url = criativo_url;
    if (criativo_tipo !== undefined) updateData.criativo_tipo = criativo_tipo;
    if (formato !== undefined) updateData.formato = formato;
    if (objetivo !== undefined) updateData.objetivo = objetivo;
    if (acao_conversao !== undefined) updateData.acao_conversao = acao_conversao;
    if (periodo_inicio !== undefined) updateData.periodo_inicio = periodo_inicio;
    if (periodo_fim !== undefined) updateData.periodo_fim = periodo_fim;
    if (publico !== undefined) updateData.publico = publico;

    const updated = await service.updateCampaign(params.id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, `PATCH /api/campaigns/${params.id}`);
  }
}
