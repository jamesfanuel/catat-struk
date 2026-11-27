import { NextResponse } from 'next/server';
import { updateUserSheetUrl, getUserByUsername, sanitizeUser } from '@/lib/server/auth-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    await updateUserSheetUrl(username, body.sheetUrl || '');
    const updated = await getUserByUsername(username);
    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (err) {
    console.error('[auth/save-sheet] Internal error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan link sheet.' }, { status: 500 });
  }
}
