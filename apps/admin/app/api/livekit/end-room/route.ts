import { RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { roomId } = await req.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const host = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !host) {
      return NextResponse.json({ error: 'Server configuration error: LiveKit env not found' }, { status: 500 });
    }

    const roomService = new RoomServiceClient(host, apiKey, apiSecret);

    // Explicitly delete the room in LiveKit to drop all connections and stop billing
    await roomService.deleteRoom(roomId);

    return NextResponse.json({ success: true, message: 'Room deleted from LiveKit' });
  } catch (err: any) {
    console.error("Failed to delete room in LiveKit:", err);
    // Even if it fails (e.g., room already deleted), we return 200 so the client can continue
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}
