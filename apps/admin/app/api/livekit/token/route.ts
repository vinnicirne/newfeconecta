import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const identity = req.nextUrl.searchParams.get('identity');
  const name = req.nextUrl.searchParams.get('name');

  const avatar = req.nextUrl.searchParams.get('avatar');

  if (!room || !identity) {
    return NextResponse.json({ error: 'Missing room or identity' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY || 'API6WWaE7wwU2xV';
  const apiSecret = process.env.LIVEKIT_API_SECRET || 'TcMSmCECKQbeZUZNxUf2dCGK5DIgNmsyji31fh2bKqeC';

  const at = new AccessToken(apiKey, apiSecret, {
    identity: identity,
    name: name || identity,
    metadata: JSON.stringify({ avatar }),
  });

  at.addGrant({
    roomJoin: true,
    room: room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({ token: await at.toJwt() });
}
