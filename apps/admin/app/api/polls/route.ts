import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import * as pollService from "@/domain/polls/poll.service";
import type { CreatePollDto } from "@/domain/polls/types";

// GET /api/polls — lista enquetes públicas
export async function GET() {
  try {
    const polls = await pollService.listPolls();
    return NextResponse.json({ polls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/polls — cria enquete (auth obrigatória)
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body: CreatePollDto = await request.json();

    // Validações
    if (!body.question || body.question.trim().length === 0) {
      return NextResponse.json({ error: "Pergunta obrigatória" }, { status: 400 });
    }
    if (!Array.isArray(body.options) || body.options.length < 2) {
      return NextResponse.json(
        { error: "Mínimo de 2 opções obrigatório" },
        { status: 400 }
      );
    }
    if (body.options.length > 8) {
      return NextResponse.json(
        { error: "Máximo de 8 opções permitido" },
        { status: 400 }
      );
    }
    for (const opt of body.options) {
      if (!opt.id || !opt.text || opt.text.trim().length === 0) {
        return NextResponse.json(
          { error: "Todas as opções devem ter id e texto" },
          { status: 400 }
        );
      }
    }

    const poll = await pollService.createPoll(user.id, {
      question: body.question.trim(),
      options: body.options.map((o) => ({ id: o.id, text: o.text.trim() })),
      allow_multiple: body.allow_multiple ?? false,
      is_public: body.is_public ?? true,
    });

    return NextResponse.json({ poll }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    const status = message.includes("autorizado") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
