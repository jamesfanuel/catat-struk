import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getUserByEmail, createOtpToken } from '@/lib/server/auth-service';
import { sendTemplateEmail } from '@/lib/server/email-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Masukkan alamat email yang valid.' }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing && existing.username !== username) {
      return NextResponse.json({ ok: false, error: 'Email sudah digunakan oleh akun lain.' }, { status: 409 });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const otpToken = createOtpToken({ username, email, otp });

    const emailRes = await sendTemplateEmail({
      to: email,
      template: 'otp',
      data: { username, otp },
    });

    if (!emailRes.ok) {
      return NextResponse.json(
        { ok: false, error: emailRes.error || emailRes.reason || 'Gagal mengirim email OTP.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      otpToken,
      message: `Kode OTP telah dikirim ke ${email}.`,
    });
  } catch (err) {
    console.error('[auth/email-otp] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal mengirim OTP.' }, { status: 500 });
  }
}
