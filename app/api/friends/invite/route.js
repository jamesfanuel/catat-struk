import { NextResponse } from 'next/server';
import { sendTemplateEmail } from '@/lib/server/email-service';

export async function POST(request) {
  try {
    const inviterUsername = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Alamat email tidak valid.' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://catat-struk.vercel.app';
    const res = await sendTemplateEmail({
      to: email,
      template: 'invite_friend',
      data: { inviterUsername, appUrl: origin },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.error || res.reason || 'Gagal mengirim email undangan.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: `Undangan berhasil dikirim ke ${email}!` });
  } catch (err) {
    console.error('[friends/invite] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal mengirim undangan.' }, { status: 500 });
  }
}
