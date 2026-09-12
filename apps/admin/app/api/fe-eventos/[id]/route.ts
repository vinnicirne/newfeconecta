import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { EventService } from "@/domain/events/event.service";
import { handleApiError } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    const service = new EventService();

    const event = await service.getEventById(params.id, user?.id);
    return NextResponse.json(event);
  } catch (error) {
    return handleApiError(error, `GET /api/fe-eventos/${params.id}`);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const service = new EventService();
    const existing = await service.getEventById(params.id);

    if (existing.author_id !== user.id) {
      return NextResponse.json(
        { error: "Apenas o criador pode editar o evento" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await service.updateEvent(params.id, body);

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, `PATCH /api/fe-eventos/${params.id}`);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const service = new EventService();
    const existing = await service.getEventById(params.id);

    if (existing.author_id !== user.id) {
      return NextResponse.json(
        { error: "Apenas o criador pode excluir o evento" },
        { status: 403 }
      );
    }

    await service.deleteEvent(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, `DELETE /api/fe-eventos/${params.id}`);
  }
}
