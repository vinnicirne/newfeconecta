import { NextResponse } from 'next/server';

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
  const trackId = searchParams.get('id');

  const headers = getCorsHeaders();

  if (!trackId || !trackId.trim()) {
    return NextResponse.json(
      { error: 'Parameter "id" is required', code: 'MISSING_TRACK_ID' },
      { status: 400, headers }
    );
  }

  const id = trackId.trim();

  return NextResponse.json(
    {
      id,
      providerTrackId: id,
      source: 'youtube',
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`,
      artwork: {
        small: `https://i.ytimg.com/vi/${id}/default.jpg`,
        medium: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        large: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        maxres: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
      },
      playerConfig: {
        disableRemotePlayback: true,
        autoplay: true,
        controls: true,
      }
    },
    { headers }
  );
}
