import { NextResponse } from 'next/server';
import { handleSheetsAction } from '@/lib/server/sheets-service';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await handleSheetsAction(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
