import { NextResponse } from 'next/server';
import { deleteTransaction } from '@/lib/server/transactions-service';

export async function DELETE(request, context) {
  try {
    const username = request.headers.get('x-auth-user');
    const params = await context.params;
    const txId = decodeURIComponent(params?.txId || '');
    await deleteTransaction(username, txId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[transactions DELETE] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus transaksi' }, { status: 500 });
  }
}
