import { NextResponse } from 'next/server';
import { listUserItineraries, replaceUserItineraries } from '@/lib/server/itineraries-service';

export async function GET(request) {
  try {
    const username = request.headers.get('x-auth-user') || 'premium';
    const itineraries = await listUserItineraries(username);
    return NextResponse.json({ ok: true, itineraries });
  } catch (err) {
    console.error('[itineraries GET] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memuat itinerary' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user') || 'premium';
    const body = await request.json().catch(() => ({}));
    const count = await replaceUserItineraries(username, body.itineraries);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error('[itineraries POST] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan itinerary' }, { status: 500 });
  }
}
