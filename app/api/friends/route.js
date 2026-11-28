import { NextResponse } from 'next/server';
import {
  listFriendsAndGroups,
  createGroup,
  deleteGroup,
  addFriendByEmail,
  removeFriend,
} from '@/lib/server/friends-service';
import { writeAuditLog } from '@/lib/server/audit-service';

export async function GET(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const data = await listFriendsAndGroups(username);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error('[friends GET] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memuat daftar grup & teman.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));

    if (body.action === 'create_group') {
      const res = await createGroup(username, body.groupName);
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: res.status || 400 });
      }
      await writeAuditLog({ actor: username, action: 'GROUP_CREATE', target: res.groupName, status: 'success', request });
      return NextResponse.json({ ok: true, groupName: res.groupName });
    }

    const result = await addFriendByEmail(username, body.email, body.groupName);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, notFound: Boolean(result.notFound), error: result.error },
        { status: result.status || 400 }
      );
    }
    await writeAuditLog({ actor: username, action: 'FRIEND_ADD', target: `${result.friend?.username || body.email} (${result.friend?.groupName})`, status: 'success', request });
    return NextResponse.json({ ok: true, friend: result.friend });
  } catch (err) {
    console.error('[friends POST] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memproses permintaan grup.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));

    if (body.action === 'delete_group') {
      const res = await deleteGroup(username, body.groupName);
      if (!res?.ok) {
        return NextResponse.json({ ok: false, error: res?.error || 'Gagal menghapus grup.' }, { status: res?.status || 400 });
      }
      await writeAuditLog({ actor: username, action: 'GROUP_DELETE', target: String(body.groupName || ''), status: 'success', request });
      return NextResponse.json({ ok: true });
    }

    const res = await removeFriend(username, body.friendUsername);
    if (!res?.ok) {
      return NextResponse.json({ ok: false, error: res?.error || 'Gagal menghapus anggota.' }, { status: res?.status || 400 });
    }
    await writeAuditLog({ actor: username, action: 'FRIEND_REMOVE', target: String(body.friendUsername || ''), status: 'success', request });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[friends DELETE] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus anggota/grup.' }, { status: 500 });
  }
}
