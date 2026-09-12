import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import * as pollService from "@/domain/polls/poll.service";

// GET /api/polls/[id] — detalhe com results + my_vote (auth opcional)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    let userId: string | undefined;
    try {
      const user = await requireAuth(request);
      userId = user.id;
    } catch {
      // auth opcional para GET
    }

    const poll = await pollService.getPollById(params.id, userId);
    if (!poll) {
      return NextResponse.json({ error: "Enquete nao encontrada" }, { status: 404 });
    }

    return NextResponse.json({ poll });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/polls/[id] — deleta (auth + deve ser o author)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);

    const poll = await pollService.getPollById(params.id);
    if (!poll) {
      return NextResponse.json({ error: "Enquete nao encontrada" }, { status: 404 });
    }
    if (poll.author_id !== user.id) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    await pollService.deletePoll(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    const status = message.includes("autorizado") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}