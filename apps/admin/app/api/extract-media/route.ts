import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    // SECURITY: Apenas usuários logados podem requisitar extração de mídia. (Impede proxy pirata)
    await requireAuth(request);

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const isInstagram = url.includes('instagram.com');

    if (isInstagram) {
      // PROJETO PAUSADO: O Instagram bloqueia acessos de IPs de Datacenter (AWS/Vercel).
      // Sem um proxy residencial pago, a extração de vídeos nativos e privados falhará.
      // Retornar 404 imediatamente força o frontend a usar o "Plano B" (iFrame Nativo) sem lentidão.
      return NextResponse.json({ error: 'Media not found (Instagram direct extraction archived)' }, { status: 404 });
    }

    // Fallback para YouTube/TikTok via VPS
    const EXTRACTOR_URL = process.env.EXTRACTOR_URL || 'http://209.50.229.10:8086/extract';

    const response = await fetch(EXTRACTOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Extractor Engine Error:", errorData);
      return NextResponse.json({ error: 'Failed to extract media' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("API Route /extract-media Error:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
