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
    const quantity = typeof body.quantity === "number" ? body.quantity : 1;

    const service = new EventService();
    await service.setItemCommitment(params.itemId, user.id, quantity);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, `POST /api/fe-eventos/${params.id}/items/${params.itemId}`);
  }
}
