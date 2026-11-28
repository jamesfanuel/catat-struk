import { NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword } from '@/lib/server/auth-service';

export async function POST(request) {
  try {
    const authUser = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const username = String(authUser || body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Password wajib diisi.' }, { status: 400 });
    }

    const row = await getUserByUsername(username);
    if (!row || !verifyPassword(password, row.password)) {
      return NextResponse.json({ ok: false, error: 'Password salah.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[verify-password] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memverifikasi password.' }, { status: 500 });
  }
}
