import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import * as pollService from "@/domain/polls/poll.service";

// POST /api/polls/[id]/vote
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const body: { option_ids: string[] } = await request.json();

    if (!Array.isArray(body.option_ids) || body.option_ids.length === 0) {
      return NextResponse.json(
        { error: "option_ids deve ser um array nao vazio" },
        { status: 400 }
      );
    }

    // Busca o poll para validar as opcoes
    const poll = await pollService.getPollById(params.id);
    if (!poll) {
      return NextResponse.json({ error: "Enquete nao encontrada" }, { status: 404 });
    }

    // Verifica se a enquete expirou
    if (new Date(poll.expires_at) < new Date()) {
      return NextResponse.json({ error: "Enquete encerrada" }, { status: 422 });
    }

    // Valida se os option_ids pertencem ao poll
    const validIds = new Set(poll.options.map((o) => o.id));
    for (const oid of body.option_ids) {
      if (!validIds.has(oid)) {
        return NextResponse.json(
          { error: `Opcao invalida: ${oid}` },
          { status: 400 }
        );
      }
    }

    // Para enquete de escolha unica, aceita apenas 1 opcao
    if (!poll.allow_multiple && body.option_ids.length > 1) {
      return NextResponse.json(
        { error: "Esta enquete permite apenas uma escolha" },
        { status: 400 }
      );
    }

    const updated = await pollService.vote(params.id, user.id, body.option_ids);
    return NextResponse.json({ poll: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    const status = message.includes("autorizado") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}