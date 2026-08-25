import { NextResponse } from 'next/server';
import { generateDailyMessage } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // SECURITY: Exige autenticação para evitar Denial of Wallet (drenagem de cota da IA).
  try {
    await requireAuth(request);
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const jsonParsed = await generateDailyMessage();
    return NextResponse.json({ success: true, data: jsonParsed }, { status: 200 });
  } catch (error: any) {
    console.error('[Email Generator] Erro interno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar e-mail com IA' }, { status: 500 });
  }
}
