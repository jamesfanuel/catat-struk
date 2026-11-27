import { NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword, sanitizeUser, signToken } from '@/lib/server/auth-service';
import { sendTemplateEmail } from '@/lib/server/email-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const row = await getUserByUsername(username);
    if (!row) {
      await writeAuditLog({ actor: username, action: 'AUTH_LOGIN', target: username, status: 'failed', details: 'User not found', request });
      return NextResponse.json(
        {
          ok: false,
          notRegistered: true,
          error: 'Akun tidak ditemukan. Silakan daftar akun baru terlebih dahulu.',
        },
        { status: 404 }
      );
    }

    if (!verifyPassword(password, row.password)) {
      await writeAuditLog({ actor: username, action: 'AUTH_LOGIN', target: username, status: 'failed', details: 'Invalid password', request });
      return NextResponse.json({ ok: false, error: 'Username atau password salah.' }, { status: 401 });
    }

    const user = sanitizeUser(row);
    await writeAuditLog({ actor: user.username, action: 'AUTH_LOGIN', target: user.username, status: 'success', request });
    const token = signToken({
      username: user.username,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    const realEmail = String(row.email || '').trim();
    if (realEmail && user.is_expiring_soon) {
      sendTemplateEmail({
        to: realEmail,
        template: 'expiry_reminder',
        data: {
          username: user.username,
          untilLabel: user.is_premium_until,
          daysRemaining: user.days_remaining,
        },
      }).catch((e) => console.error('[auth/login] Expiry email error:', e));
    }

    return NextResponse.json({ ok: true, token, user });
  } catch (err) {
    console.error('[auth/login] Internal error:', err);
    return NextResponse.json({ ok: false, error: 'Terjadi gangguan pada server.' }, { status: 500 });
  }
}
