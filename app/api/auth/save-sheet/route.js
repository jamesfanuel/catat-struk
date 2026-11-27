import { NextResponse } from 'next/server';
import { updateUserSheetUrl, getUserByUsername, sanitizeUser } from '@/lib/server/auth-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    await updateUserSheetUrl(username, body.sheetUrl || '');
    const updated = await getUserByUsername(username);
    await writeAuditLog({ actor: username, action: 'USER_SAVE_SHEET', target: username, status: 'success', request });
    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (err) {
    console.error('[auth/save-sheet] Internal error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan link sheet.' }, { status: 500 });
  }
}
