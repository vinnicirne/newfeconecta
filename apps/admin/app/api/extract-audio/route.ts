import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract YouTube ID from URL
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (videoId) {
      // Import createClient to check database
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: cacheRows } = await supabase
        .from('femusic_cache')
        .select('audio_url')
        .eq('youtube_id', videoId)
        .limit(1);

      if (cacheRows && cacheRows.length > 0 && cacheRows[0].audio_url) {
        console.log(`[Proxy] Cache hit for ${videoId}, skipping VPS download!`);
        return NextResponse.json({ success: true, url: cacheRows[0].audio_url });
      }
    }

    // Call the VPS directly via HTTP (server-to-server, so no mixed-content issues on the client)
    const vpsUrl = 'http://209.50.229.10:8086/extract-audio';
    
    console.log(`[Proxy] Calling media-extractor on VPS for: ${url}`);
    
    const response = await fetch(vpsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      // Optional: Add an abort controller for timeout if needed
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Proxy] VPS returned error:', response.status, text);
      return NextResponse.json({ error: 'Failed to extract audio on VPS' }, { status: response.status });
    }

    const data = await response.json();

    if (data.success && data.url && videoId) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const { error: insertError } = await supabase
        .from('femusic_cache')
        .upsert([{ youtube_id: videoId, audio_url: data.url }], { onConflict: 'youtube_id' });
        
      if (insertError) {
        console.error('[Proxy] Cache insert error:', insertError);
      }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Proxy] Error calling VPS:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
