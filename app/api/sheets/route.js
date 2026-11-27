import { NextResponse } from 'next/server';
import { handleSheetsAction } from '@/lib/server/sheets-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user') || '';
    const body = await request.json().catch(() => ({}));
    const result = await handleSheetsAction(body);
    if (body.action && body.action !== 'config') {
      await writeAuditLog({
        actor: username,
        action: `SHEET_${String(body.action).toUpperCase()}`,
        target: username,
        status: result.body?.ok === false ? 'failed' : 'success',
        details: result.body?.count ? `rows=${result.body.count}` : '',
        request,
      });
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
