import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      const details = data.items[0].liveStreamingDetails;
      const snippet = data.items[0].snippet;
      const viewers = details?.concurrentViewers ? parseInt(details.concurrentViewers, 10) : 0;
      return NextResponse.json({ viewers, title: snippet?.title });
    }

    return NextResponse.json({ viewers: 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch', viewers: 0 }, { status: 500 });
  }
}
