import { NextResponse } from 'next/server';
import {
  getUserByUsername,
  getUserByEmail,
  createUserInDb,
  countUsersInDb,
  verifyOtpToken,
  sanitizeUser,
  signToken,
} from '@/lib/server/auth-service';
import { sendTemplateEmail } from '@/lib/server/email-service';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, email = '', password, sheetUrl = '', otp = '', otpToken = '' } = body;
    const cleanUser = String(username || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanUser || !password) {
      return NextResponse.json({ ok: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Email wajib diisi untuk pendaftaran.' }, { status: 400 });
    }
    if (!otp || !otpToken || !verifyOtpToken({ otpToken, username: cleanUser, email: cleanEmail, otp })) {
      return NextResponse.json({ ok: false, error: 'Kode OTP salah atau sudah kadaluarsa.' }, { status: 400 });
    }

    const [existingUser, existingEmail] = await Promise.all([
      getUserByUsername(cleanUser),
      getUserByEmail(cleanEmail),
    ]);
    if (existingUser) {
      return NextResponse.json({ ok: false, error: 'Username sudah terdaftar. Silakan login.' }, { status: 409 });
    }
    if (existingEmail) {
      return NextResponse.json({ ok: false, error: 'Email sudah terdaftar.' }, { status: 409 });
    }

    const created = await createUserInDb({ username: cleanUser, email: cleanEmail, password, sheetUrl });
    const userNumber = await countUsersInDb();
    const user = sanitizeUser(created);
    const token = signToken({
      username: user.username,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    sendTemplateEmail({
      to: cleanEmail,
      template: 'welcome',
      data: {
        username: user.username,
        untilLabel: user.is_lifetime ? 'Premium Selamanya' : (user.is_premium_until || 'Reguler'),
        userNumber,
      },
    }).catch((e) => console.error('[auth/register] Welcome email error:', e));

    return NextResponse.json({ ok: true, token, user, userNumber });
  } catch (err) {
    console.error('[auth/register] Internal error:', err);
    return NextResponse.json({ ok: false, error: 'Terjadi gangguan pada server.' }, { status: 500 });
  }
}
