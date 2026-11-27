import { NextResponse } from 'next/server';
import { verifyAdminPassword, signAdminToken } from '@/lib/server/admin-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!verifyAdminPassword(body.password)) {
      await writeAuditLog({ actor: 'admin', action: 'ADMIN_LOGIN', status: 'failed', details: 'Invalid admin password', request });
      return NextResponse.json({ ok: false, error: 'Password admin salah.' }, { status: 401 });
    }
    await writeAuditLog({ actor: 'admin', action: 'ADMIN_LOGIN', status: 'success', request });
    return NextResponse.json({ ok: true, token: signAdminToken() });
  } catch (err) {
    console.error('[admin/login] Error:', err);
    return NextResponse.json({ ok: false, error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
