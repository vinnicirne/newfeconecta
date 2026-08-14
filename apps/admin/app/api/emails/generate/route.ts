import { NextResponse } from 'next/server';
import { generateDailyMessage } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const jsonParsed = await generateDailyMessage();
    return NextResponse.json({ success: true, data: jsonParsed }, { status: 200 });
  } catch (error: any) {
    console.error('[Email Generator] Erro interno:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar e-mail com IA' }, { status: 500 });
  }
}
