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

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("ERRO CRITICO: LIVEKIT_API_KEY ou SECRET não encontrados no ambiente (.env)");
    return NextResponse.json({ error: 'Server configuration error: Keys not found' }, { status: 500 });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      name: name || identity,
      metadata: JSON.stringify({ avatar }),
      ttl: '1h', // Estabilidade recomendada de expiração
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (err) {
    console.error("Falha ao gerar o token local:", err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
