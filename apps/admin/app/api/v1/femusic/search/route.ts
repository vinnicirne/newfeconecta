import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  };
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function parseDurationText(text: string): number {
  if (!text) return 0;
  const parts = text.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  const headers = getCorsHeaders();

  if (!q || !q.trim()) {
    return NextResponse.json(
      {
        error: 'Query parameter "q" is required',
        code: 'MISSING_QUERY',
        results: []
      },
      { status: 400, headers }
    );
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}&sp=EgIQAQ%253D%253D`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 300 }, // Cache de 5 min
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'External provider fetch failed', code: 'UPSTREAM_ERROR', results: [] },
        { status: 502, headers }
      );
    }

    const html = await response.text();
    const dataMatch = html.match(/ytInitialData\s*=\s*({.+?});/);

    if (!dataMatch) {
      return NextResponse.json({ total: 0, results: [] }, { headers });
    }

    const data = JSON.parse(dataMatch[1]);
    const sectionList =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

    if (!sectionList || !Array.isArray(sectionList)) {
      return NextResponse.json({ total: 0, results: [] }, { headers });
    }

    const results: any[] = [];

    for (const section of sectionList) {
      const itemSection = section?.itemSectionRenderer?.contents;
      if (!Array.isArray(itemSection)) continue;

      for (const item of itemSection) {
        const video = item?.videoRenderer;
        if (!video || !video.videoId) continue;

        const durationText = video.lengthText?.simpleText || '';
        const durationSec = parseDurationText(durationText);

        // Filtra vídeos muito longos (> 30 min) para manter formato de música/faixa
        if (durationSec > 1800) continue;

        const title = decodeHtml(
          video.title?.runs?.map((r: any) => r.text).join('') ||
            video.title?.simpleText ||
            ''
        );

        const artist = decodeHtml(
          video.ownerText?.runs?.[0]?.text ||
            video.shortBylineText?.runs?.[0]?.text ||
            'Desconhecido'
        );

        const cover =
          video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url ||
          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

        results.push({
          id: video.videoId,
          providerTrackId: video.videoId,
          title,
          artist,
          duration: durationSec,
          durationFormatted: durationText || '0:00',
          coverUrl: cover,
          streamUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&enablejsapi=1`,
          source: 'youtube'
        });

        if (results.length >= limit) break;
      }

      if (results.length >= limit) break;
    }

    return NextResponse.json(
      {
        status: 'success',
        query: q.trim(),
        total: results.length,
        results,
      },
      { headers }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error', code: 'INTERNAL_ERROR', results: [] },
      { status: 500, headers }
    );
  }
}
