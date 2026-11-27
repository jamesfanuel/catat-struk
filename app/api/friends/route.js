import { NextResponse } from 'next/server';
import { listFriends, addFriendByEmail, removeFriend } from '@/lib/server/friends-service';

export async function GET(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const friends = await listFriends(username);
    return NextResponse.json({ ok: true, friends });
  } catch (err) {
    console.error('[friends GET] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memuat daftar teman.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    const result = await addFriendByEmail(username, body.email);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, notFound: Boolean(result.notFound), error: result.error },
        { status: result.status || 400 }
      );
    }
    return NextResponse.json({ ok: true, friend: result.friend });
  } catch (err) {
    console.error('[friends POST] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menambahkan teman.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const username = request.headers.get('x-auth-user');
    const body = await request.json().catch(() => ({}));
    await removeFriend(username, body.friendUsername);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[friends DELETE] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus teman.' }, { status: 500 });
  }
}
