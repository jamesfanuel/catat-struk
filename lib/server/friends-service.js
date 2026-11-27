import fs from 'node:fs';
import path from 'node:path';
import {
  getSupabaseRestBase,
  buildSupabaseHeaders,
  getWibTimestamp,
  getUserByEmail,
  encryptField,
  decryptField,
} from './auth-service.js';

function readLocalFriendsDb() {
  const p = path.join(process.cwd(), 'db', 'friends.json');
  if (!fs.existsSync(p)) return [];
  const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

function writeLocalFriendsDb(rows) {
  const p = path.join(process.cwd(), 'db', 'friends.json');
  fs.writeFileSync(p, JSON.stringify(rows, null, 2));
}

export async function listFriends(username) {
  const cleanUser = String(username || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/friends?username=eq.${encodeURIComponent(cleanUser)}&select=friend_username,friend_email,created_at&order=id.desc`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const rows = await res.json();
    return (rows || []).map((r) => ({
      username: r.friend_username,
      email: decryptField(r.friend_email || ''),
      createdAt: r.created_at || '',
    }));
  }

  if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const res = await fetch(`https://${u.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': process.env.NEON_DATABASE_URL,
      },
      body: JSON.stringify({
        query: 'SELECT friend_username, friend_email, created_at FROM friends WHERE username = $1 ORDER BY id DESC',
        params: [cleanUser],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return (data?.rows || []).map((r) => ({
      username: r.friend_username,
      email: decryptField(r.friend_email || ''),
      createdAt: r.created_at || '',
    }));
  }

  return readLocalFriendsDb()
    .filter((r) => r.username === cleanUser)
    .map((r) => ({
      username: r.friend_username,
      email: decryptField(r.friend_email || ''),
      createdAt: r.created_at || '',
    }));
}

export async function addFriendByEmail(username, email) {
  const cleanUser = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, status: 400, error: 'Masukkan alamat email yang valid.' };
  }

  const target = await getUserByEmail(cleanEmail);
  if (!target) {
    return {
      ok: false,
      status: 404,
      notFound: true,
      error: 'User belum terdaftar di CatatStruk.',
    };
  }

  if (target.username === cleanUser) {
    return { ok: false, status: 400, error: 'Tidak bisa menambahkan email Anda sendiri sebagai teman.' };
  }

  const nowWib = getWibTimestamp();
  const plainFriendEmail = target.email || cleanEmail;
  const row = {
    username: cleanUser,
    friend_username: target.username,
    friend_email: encryptField(plainFriendEmail),
    created_at: nowWib,
  };

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/friends?on_conflict=username,friend_username`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      }),
      body: JSON.stringify([row]),
    });
    if (!res.ok) throw new Error('DB_ERROR');
  } else if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const res = await fetch(`https://${u.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': process.env.NEON_DATABASE_URL,
      },
      body: JSON.stringify({
        query: 'INSERT INTO friends (username, friend_username, friend_email, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (username, friend_username) DO NOTHING',
        params: [row.username, row.friend_username, row.friend_email, row.created_at],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
  } else {
    const rows = readLocalFriendsDb();
    if (!rows.some((r) => r.username === cleanUser && r.friend_username === target.username)) {
      rows.unshift(row);
      writeLocalFriendsDb(rows);
    }
  }

  return {
    ok: true,
    friend: { username: target.username, email: plainFriendEmail, createdAt: nowWib },
  };
}

export async function removeFriend(username, friendUsername) {
  const cleanUser = String(username || '').trim();
  const cleanFriend = String(friendUsername || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/friends?username=eq.${encodeURIComponent(cleanUser)}&friend_username=eq.${encodeURIComponent(cleanFriend)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return;
  }

  if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const res = await fetch(`https://${u.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': process.env.NEON_DATABASE_URL,
      },
      body: JSON.stringify({
        query: 'DELETE FROM friends WHERE username = $1 AND friend_username = $2',
        params: [cleanUser, cleanFriend],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return;
  }

  const rows = readLocalFriendsDb();
  writeLocalFriendsDb(rows.filter((r) => !(r.username === cleanUser && r.friend_username === cleanFriend)));
}
