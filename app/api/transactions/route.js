import { NextResponse } from 'next/server';
import { listTransactions, insertMissingTransactions, upsertTransaction } from '@/lib/server/transactions-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function GET(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const list = await listTransactions(username);
    return NextResponse.json({ ok: true, transactions: list });
  } catch (err) {
    console.error('[transactions GET] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal mengakses database' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const result = await insertMissingTransactions(username, body.transactions);
    if (result.inserted > 0) {
      await writeAuditLog({
        actor: username,
        action: 'TX_CREATE',
        target: `${result.inserted} tx`,
        status: 'success',
        request,
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[transactions POST] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal mengakses database' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const result = await upsertTransaction(username, body.transaction);
    await writeAuditLog({
      actor: username,
      action: 'TX_UPDATE',
      target: String(body.transaction?.id || ''),
      status: 'success',
      request,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[transactions PATCH] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memperbarui transaksi' }, { status: 500 });
  }
}
