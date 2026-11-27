import { NextResponse } from 'next/server';
import { listUsernames } from '@/lib/server/auth-service';

export async function GET() {
  try {
    const users = await listUsernames();
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error('[auth/users] Internal error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memuat daftar user.' }, { status: 500 });
  }
}
