import { NextResponse } from 'next/server';
import {
  listSocialJournalPosts,
  createSocialJournalPost,
  deleteSocialJournalPost,
} from '@/lib/server/social-journal-service';

export async function GET() {
  try {
    const posts = await listSocialJournalPosts();
    return NextResponse.json({ ok: true, posts });
  } catch (err) {
    console.error('[social-journal GET] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memuat social journal' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const username = request.headers.get('x-auth-user') || 'premium';
    const body = await request.json().catch(() => ({}));
    const post = body.post;
    if (!post || !post.resto) {
      return NextResponse.json({ ok: false, error: 'Data ulasan tidak lengkap' }, { status: 400 });
    }
    const created = await createSocialJournalPost(username, post);
    return NextResponse.json({ ok: true, post: created });
  } catch (err) {
    console.error('[social-journal POST] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan ulasan' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID diperlukan' }, { status: 400 });
    await deleteSocialJournalPost(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[social-journal DELETE] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus ulasan' }, { status: 500 });
  }
}
