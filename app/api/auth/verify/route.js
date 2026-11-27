import { NextResponse } from 'next/server';
import { getUserByUsername, sanitizeUser } from '@/lib/server/auth-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const row = await getUserByUsername(username);
    if (!row) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user: sanitizeUser(row) });
  } catch (err) {
    console.error('[auth/verify] Internal error:', err);
    return NextResponse.json({ ok: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
