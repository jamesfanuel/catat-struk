import { NextResponse } from 'next/server';
import { acceptOutstandingTransaction, listTransactions } from '@/lib/server/transactions-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const txId = String(body.txId || '');
    await acceptOutstandingTransaction(username, txId);
    await writeAuditLog({ actor: username, action: 'TX_OUTSTANDING_ACCEPT', target: txId, status: 'success', request });
    const list = await listTransactions(username);
    return NextResponse.json({ ok: true, transactions: list });
  } catch (err) {
    console.error('[transactions/accept] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menerima transaksi outstanding' }, { status: 500 });
  }
}
