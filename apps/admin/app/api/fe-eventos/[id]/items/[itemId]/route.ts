import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { EventService } from "@/domain/events/event.service";
import { handleApiError } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const quantity = body.quantity === undefined ? 1 : body.quantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json({ error: "Informe uma quantidade válida" }, { status: 400 });
    }

    const service = new EventService();
    await service.setItemCommitment(params.id, params.itemId, user.id, quantity);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, `POST /api/fe-eventos/${params.id}/items/${params.itemId}`);
  }
}
