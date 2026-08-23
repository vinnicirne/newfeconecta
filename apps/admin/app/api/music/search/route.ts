import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '15', 10);

  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] });
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
      return NextResponse.json({ results: [], error: 'YouTube fetch failed' }, { status: 502 });
    }

    const html = await response.text();
    const dataMatch = html.match(/ytInitialData\s*=\s*({.+?});/);

    if (!dataMatch) {
      return NextResponse.json({ results: [] });
    }

    const ytData = JSON.parse(dataMatch[1]);
    const contents =
      ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json({ results: [] });
    }

    const items: any[] = [];

    for (const section of contents) {
      const itemSection = section?.itemSectionRenderer?.contents;
      if (Array.isArray(itemSection)) {
        for (const item of itemSection) {
          if (item?.videoRenderer) {
            items.push(item.videoRenderer);
          }
        }
      }
    }

    const results = items
      .map((item: any) => {
        const videoId = item.videoId;
        if (!videoId) return null;

        const title = decodeHtml(
          item.title?.runs?.[0]?.text || item.title?.accessibility?.accessibilityData?.label || ''
        );
        const artist = decodeHtml(item.ownerText?.runs?.[0]?.text || 'Gospel');
        const durationText = item.lengthText?.simpleText || item.lengthText?.accessibility?.accessibilityData?.label || '';
        const durationSeconds = parseDurationText(durationText);
        const thumbnails = item.thumbnail?.thumbnails || [];
        const cover =
          thumbnails[thumbnails.length - 1]?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        return {
          id: videoId,
          title: title || 'Música',
          artist: artist || 'FéConecta',
          duration: durationSeconds || 210,
          cover: cover.startsWith('//') ? `https:${cover}` : cover,
          provider: 'youtube',
          providerTrackId: videoId,
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[YouTube Scraper Search Error]:', error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
