import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  getUserByUsername,
  getUserByEmail,
  createOtpToken,
} from '@/lib/server/auth-service';
import { sendTemplateEmail } from '@/lib/server/email-service';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username wajib diisi.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Alamat email wajib diisi dengan format yang valid.' }, { status: 400 });
    }

    const [existingUser, existingEmail] = await Promise.all([
      getUserByUsername(username),
      getUserByEmail(email),
    ]);
    if (existingUser) {
      return NextResponse.json({ ok: false, error: 'Username sudah terdaftar. Silakan login.' }, { status: 409 });
    }
    if (existingEmail) {
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
        {
          ok: false,
          error: emailRes.error || emailRes.reason || 'Gagal mengirim email OTP. Pastikan konfigurasi email server aktif.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      otpToken,
      message: `Kode OTP telah dikirim ke ${email}.`,
    });
  } catch (err) {
    console.error('[auth/send-otp] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memproses pengiriman OTP.' }, { status: 500 });
  }
}
