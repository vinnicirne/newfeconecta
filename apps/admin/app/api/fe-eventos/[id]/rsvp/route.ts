import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { EventService } from "@/domain/events/event.service";
import { RSVPStatus } from "@/domain/events/types";
import { handleApiError } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const status = body.status as RSVPStatus;

    if (!["going", "maybe", "not_going"].includes(status)) {
      return NextResponse.json({ error: "Status de RSVP inválido" }, { status: 400 });
    }

    const service = new EventService();
    const updatedRSVP = await service.setRSVP(params.id, user.id, status);

    return NextResponse.json(updatedRSVP);
  } catch (error) {
    return handleApiError(error, `POST /api/fe-eventos/${params.id}/rsvp`);
  }
}
