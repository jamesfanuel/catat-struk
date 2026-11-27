import { NextResponse } from 'next/server';
import { verifyAdminPassword, signAdminToken } from '@/lib/server/admin-service';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!verifyAdminPassword(body.password)) {
      return NextResponse.json({ ok: false, error: 'Password admin salah.' }, { status: 401 });
    }
    return NextResponse.json({ ok: true, token: signAdminToken() });
  } catch (err) {
    console.error('[admin/login] Error:', err);
    return NextResponse.json({ ok: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
