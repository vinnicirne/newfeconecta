import { NextResponse } from 'next/server';
import { READY_SESSIONS } from '@/modules/femusic/domain/sessions';

export const dynamic = 'force-dynamic';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');

  const headers = getCorsHeaders();

  if (sessionId) {
    const session = READY_SESSIONS.find((s) => s.id === sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'SESSION_NOT_FOUND' },
        { status: 404, headers }
      );
    }
    return NextResponse.json({ session }, { headers });
  }

  return NextResponse.json(
    {
      total: READY_SESSIONS.length,
      sessions: READY_SESSIONS.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        emoji: s.emoji,
        durationLabel: s.durationLabel,
        color: s.color,
        queries: s.queries,
      })),
    },
    { headers }
  );
}
