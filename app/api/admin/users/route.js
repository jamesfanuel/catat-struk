import { NextResponse } from 'next/server';
import {
  fetchAllUsers,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
} from '@/lib/server/admin-service';

export async function GET() {
  try {
    const users = await fetchAllUsers();
    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error('[admin/users GET] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memuat data user.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, email, password, is_premium_until, sheet_url } = body;
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
    }
    const user = await createUserAdmin({ username, email, password, is_premium_until, sheet_url });
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    if (err.message === 'USERNAME_EXISTS') {
      return NextResponse.json({ ok: false, error: 'Username sudah terdaftar.' }, { status: 409 });
    }
    console.error('[admin/users POST] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal membuat user.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, email, password, is_premium_until, sheet_url } = body;
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username wajib diisi.' }, { status: 400 });
    }
    const user = await updateUserAdmin({ username, email, password, is_premium_until, sheet_url });
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }
    console.error('[admin/users PATCH] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal memperbarui user.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username } = body;
    if (!username) {
      return NextResponse.json({ ok: false, error: 'Username wajib diisi.' }, { status: 400 });
    }
    await deleteUserAdmin(username);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/users DELETE] Error:', err);
    return NextResponse.json({ ok: false, error: 'Gagal menghapus user.' }, { status: 500 });
  }
}
