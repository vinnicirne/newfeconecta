import { appendFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

const LOG_FILE = join(process.cwd(), 'debug-f10735.log');

// Rate limiting simples em memória (por IP, reinicia a cada deploy serverless)
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;        // máximo de requisições
const RATE_WINDOW_MS = 60_000; // janela de 1 minuto

export async function POST(req: NextRequest) {
  // SECURITY: Apenas usuários autenticados podem escrever logs de debug.
  // Impede poluição de logs e crescimento de disco por usuários não autenticados.
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }

  // Rate limiting por IP para evitar flood
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const record = ipRateMap.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= RATE_LIMIT) {
      return NextResponse.json({ ok: false, error: 'Rate limit excedido' }, { status: 429 });
    }
    record.count++;
  } else {
    ipRateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  }

  try {
    const body = await req.json();
    const line =
      JSON.stringify({
        ...body,
        receivedAt: Date.now(),
      }) + '\n';
    appendFileSync(LOG_FILE, line, 'utf8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
