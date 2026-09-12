import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { EventService } from "@/domain/events/event.service";
import { handleApiError } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    const service = new EventService();

    const events = await service.listEvents({
      is_public: true,
      author_id: user?.id,
    });

    return NextResponse.json(events);
  } catch (error) {
    return handleApiError(error, "GET /api/fe-eventos");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const service = new EventService();

    const newEvent = await service.createEvent(user.id, {
      title: body.title,
      description: body.description,
      church_id: body.church_id,
      cover_url: body.cover_url,
      location: body.location,
      online_link: body.online_link,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      is_public: body.is_public ?? true,
      items: body.items,
    });

    return NextResponse.json({ event: newEvent, id: newEvent.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/fe-eventos");
  }
}
