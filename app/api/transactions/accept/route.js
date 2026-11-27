import { NextResponse } from 'next/server';
import { acceptOutstandingTransaction, listTransactions } from '@/lib/server/transactions-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    await acceptOutstandingTransaction(username, String(body.txId || ''));
    const list = await listTransactions(username);
    return NextResponse.json({ ok: true, transactions: list });
  } catch (err) {
    console.error('[transactions/accept] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menerima transaksi outstanding' }, { status: 500 });
  }
}
