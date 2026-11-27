import { NextResponse } from 'next/server';
import { listAuditLogs } from '@/lib/server/audit-service';

export async function GET(request) {
  try {
    const limitParam = request.nextUrl?.searchParams?.get('limit');
    const logs = await listAuditLogs({ limit: Number(limitParam) || 150 });
    return NextResponse.json({ ok: true, logs });
  } catch (err) {
    console.error('[admin/logs GET] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memuat audit log.' }, { status: 500 });
  }
}
