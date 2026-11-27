import { NextResponse } from 'next/server';
import { shareSplitTransactions } from '@/lib/server/transactions-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const result = await shareSplitTransactions(username, body.shares);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[transactions/share] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal mengirim split bill' }, { status: 500 });
  }
}
