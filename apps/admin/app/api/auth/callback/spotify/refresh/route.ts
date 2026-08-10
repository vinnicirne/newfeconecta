import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { user_id, refresh_token } = await request.json();

    if (!user_id || !refresh_token) {
      return NextResponse.json({ error: 'Missing user_id or refresh_token' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Spotify token refresh error:', tokenData);
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 400 });
    }

    // Usar o client do Supabase com Service Role Key para ignorar RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('music_provider_accounts')
      .upsert({
        user_id,
        provider: 'spotify',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refresh_token, // Se não vier um novo, mantém o antigo
        expires_at: expiresAt
      }, { onConflict: 'user_id, provider' });

    if (upsertError) {
      console.error('Supabase upsert error on refresh:', upsertError);
      return NextResponse.json({ error: 'Failed to update token in database' }, { status: 500 });
    }

    return NextResponse.json({ access_token: tokenData.access_token, expires_at: expiresAt });
  } catch (error) {
    console.error('Refresh endpoint error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
