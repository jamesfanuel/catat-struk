import { NextResponse } from 'next/server';
import { deleteTransaction } from '@/lib/server/transactions-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function DELETE(request, context) {
  try {
    const username = request.headers.get('x-auth-user');
    const params = await context.params;
    const txId = decodeURIComponent(params?.txId || '');
    await deleteTransaction(username, txId);
    await writeAuditLog({ actor: username, action: 'TX_DELETE', target: txId, status: 'success', request });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[transactions DELETE] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus transaksi' }, { status: 500 });
  }
}
