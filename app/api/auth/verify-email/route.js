import { NextResponse } from 'next/server';
import {
  getUserByEmail,
  getUserByUsername,
  updateUserEmail,
  verifyOtpToken,
  sanitizeUser,
} from '@/lib/server/auth-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const otp = String(body.otp || '').trim();
    const otpToken = String(body.otpToken || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Alamat email tidak valid.' }, { status: 400 });
    }
    if (!otp || !otpToken || !verifyOtpToken({ otpToken, username, email, otp })) {
      return NextResponse.json({ ok: false, error: 'Kode OTP salah atau sudah kadaluarsa.' }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing && existing.username !== username) {
      return NextResponse.json({ ok: false, error: 'Email sudah digunakan oleh akun lain.' }, { status: 409 });
    }

    await updateUserEmail(username, email);
    const updated = await getUserByUsername(username);
    await writeAuditLog({ actor: username, action: 'AUTH_VERIFY_EMAIL', target: email, status: 'success', request });
    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (err) {
    console.error('[auth/verify-email] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memverifikasi email.' }, { status: 500 });
  }
}
