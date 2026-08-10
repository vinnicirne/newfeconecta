import { appendFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

const LOG_FILE = join(process.cwd(), 'debug-f10735.log');

export async function POST(req: NextRequest) {
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
