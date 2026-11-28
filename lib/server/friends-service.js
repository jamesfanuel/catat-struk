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

export const MAX_FRIENDS_LIMIT = 50;
export const GROUP_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 1x24 jam

function parseWibTimestampMs(ts) {
  const s = String(ts || '').trim();
  if (!s) return 0;
  // Format: YYYY-MM-DD HH:mm:ss (WIB = UTC+7)
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}+07:00`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

export function getGroupLockStatus(createdAt) {
  const createdMs = parseWibTimestampMs(createdAt);
  if (!createdMs) return { isLocked: false, hoursRemaining: 24 };
  const elapsed = Date.now() - createdMs;
  if (elapsed >= GROUP_EDIT_WINDOW_MS) {
    return { isLocked: true, hoursRemaining: 0 };
  }
  const remHours = Math.max(1, Math.ceil((GROUP_EDIT_WINDOW_MS - elapsed) / (60 * 60 * 1000)));
  return { isLocked: false, hoursRemaining: remHours };
}

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

function readLocalGroupsDb() {
  const p = path.join(process.cwd(), 'db', 'friend_groups.json');
  if (!fs.existsSync(p)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalGroupsDb(rows) {
  const p = path.join(process.cwd(), 'db', 'friend_groups.json');
  fs.writeFileSync(p, JSON.stringify(rows, null, 2));
}

export async function listFriends(username) {
  const cleanUser = String(username || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/friends?username=eq.${encodeURIComponent(cleanUser)}&select=friend_username,friend_email,group_name,created_at&order=id.desc`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const rows = await res.json();
    return (rows || []).map((r) => ({
      username: r.friend_username,
      email: decryptField(r.friend_email || ''),
      groupName: String(r.group_name || 'Umum').trim() || 'Umum',
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
        query: 'SELECT friend_username, friend_email, group_name, created_at FROM friends WHERE username = $1 ORDER BY id DESC',
        params: [cleanUser],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return (data?.rows || []).map((r) => ({
      username: r.friend_username,
      email: decryptField(r.friend_email || ''),
      groupName: String(r.group_name || 'Umum').trim() || 'Umum',
      createdAt: r.created_at || '',
    }));
  }

  return readLocalFriendsDb()
    .filter((r) => r.username === cleanUser)
    .map((r) => ({
      username: r.friend_username,
      email: decryptField(r.friend_email || ''),
      groupName: String(r.group_name || 'Umum').trim() || 'Umum',
      createdAt: r.created_at || '',
    }));
}

export async function listGroups(username) {
  const cleanUser = String(username || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const url = `${getSupabaseRestBase()}/rest/v1/friend_groups?username=eq.${encodeURIComponent(cleanUser)}&select=group_name,created_at&order=id.asc`;
      const res = await fetch(url, {
        headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
      if (res.ok) {
        const rows = await res.json();
        return (rows || [])
          .map((r) => ({
            name: String(r.group_name || '').trim(),
            createdAt: String(r.created_at || ''),
            ...getGroupLockStatus(r.created_at),
          }))
          .filter((g) => g.name);
      }
    } catch { }
    return [];
  }

  if (process.env.NEON_DATABASE_URL) {
    try {
      const u = new URL(process.env.NEON_DATABASE_URL);
      const res = await fetch(`https://${u.hostname}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Neon-Connection-String': process.env.NEON_DATABASE_URL,
        },
        body: JSON.stringify({
          query: 'SELECT group_name, created_at FROM friend_groups WHERE username = $1 ORDER BY id ASC',
          params: [cleanUser],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return (data?.rows || [])
          .map((r) => ({
            name: String(r.group_name || '').trim(),
            createdAt: String(r.created_at || ''),
            ...getGroupLockStatus(r.created_at),
          }))
          .filter((g) => g.name);
      }
    } catch { }
    return [];
  }

  return readLocalGroupsDb()
    .filter((r) => r.username === cleanUser)
    .map((r) => ({
      name: String(r.group_name || '').trim(),
      createdAt: String(r.created_at || ''),
      ...getGroupLockStatus(r.created_at),
    }))
    .filter((g) => g.name);
}

export async function listFriendsAndGroups(username) {
  const [friends, savedGroups] = await Promise.all([
    listFriends(username),
    listGroups(username),
  ]);
  const metaMap = new Map();
  savedGroups.forEach((g) => metaMap.set(g.name, g));
  friends.forEach((f) => {
    if (f.groupName && !metaMap.has(f.groupName)) {
      metaMap.set(f.groupName, {
        name: f.groupName,
        createdAt: f.createdAt || '',
        ...getGroupLockStatus(f.createdAt),
      });
    }
  });
  const groupsMeta = Array.from(metaMap.values());
  return {
    friends,
    groups: groupsMeta.map((g) => g.name),
    groupsMeta,
    maxFriends: MAX_FRIENDS_LIMIT,
  };
}

export async function createGroup(username, groupName) {
  const cleanUser = String(username || '').trim();
  const cleanGroup = String(groupName || '').trim().slice(0, 80);
  if (!cleanGroup) {
    return { ok: false, status: 400, error: 'Nama grup wajib diisi.' };
  }

  const nowWib = getWibTimestamp();
  const row = {
    username: cleanUser,
    group_name: cleanGroup,
    created_at: nowWib,
  };

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/friend_groups?on_conflict=username,group_name`;
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
        query: 'INSERT INTO friend_groups (username, group_name, created_at) VALUES ($1, $2, $3) ON CONFLICT (username, group_name) DO NOTHING',
        params: [cleanUser, cleanGroup, nowWib],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
  } else {
    const rows = readLocalGroupsDb();
    if (!rows.some((r) => r.username === cleanUser && r.group_name.toLowerCase() === cleanGroup.toLowerCase())) {
      rows.push(row);
      writeLocalGroupsDb(rows);
    }
  }

  return { ok: true, groupName: cleanGroup };
}

export async function deleteGroup(username, groupName) {
  const cleanUser = String(username || '').trim();
  const cleanGroup = String(groupName || '').trim();
  if (!cleanGroup) return { ok: false, status: 400, error: 'Nama grup kosong.' };

  const groups = await listGroups(cleanUser);
  const existingGroup = groups.find((g) => g.name === cleanGroup);
  if (existingGroup?.isLocked) {
    return {
      ok: false,
      status: 403,
      error: 'Grup terkunci setelah 1x24 jam untuk menjaga integritas data Split Bill & Itinerary.',
    };
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await fetch(
      `${getSupabaseRestBase()}/rest/v1/friend_groups?username=eq.${encodeURIComponent(cleanUser)}&group_name=eq.${encodeURIComponent(cleanGroup)}`,
      { method: 'DELETE', headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY) }
    );
    await fetch(
      `${getSupabaseRestBase()}/rest/v1/friends?username=eq.${encodeURIComponent(cleanUser)}&group_name=eq.${encodeURIComponent(cleanGroup)}`,
      { method: 'DELETE', headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY) }
    );
    return { ok: true };
  }

  if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      'Neon-Connection-String': process.env.NEON_DATABASE_URL,
    };
    await fetch(`https://${u.hostname}/sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: 'DELETE FROM friend_groups WHERE username = $1 AND group_name = $2',
        params: [cleanUser, cleanGroup],
      }),
    });
    await fetch(`https://${u.hostname}/sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: 'DELETE FROM friends WHERE username = $1 AND group_name = $2',
        params: [cleanUser, cleanGroup],
      }),
    });
    return { ok: true };
  }

  writeLocalGroupsDb(readLocalGroupsDb().filter((r) => !(r.username === cleanUser && r.group_name === cleanGroup)));
  writeLocalFriendsDb(readLocalFriendsDb().filter((r) => !(r.username === cleanUser && (r.group_name || 'Umum') === cleanGroup)));
  return { ok: true };
}

export async function addFriendByEmail(username, email, groupName = 'Umum') {
  const cleanUser = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanGroup = String(groupName || 'Umum').trim().slice(0, 80) || 'Umum';
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, status: 400, error: 'Masukkan alamat email yang valid.' };
  }

  const groups = await listGroups(cleanUser);
  const existingGroup = groups.find((g) => g.name === cleanGroup);
  if (existingGroup?.isLocked) {
    return {
      ok: false,
      status: 403,
      error: `Grup "${cleanGroup}" sudah melewati batas edit 1x24 jam.`,
    };
  }

  const existingFriends = await listFriends(cleanUser);
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

  const alreadyExists = existingFriends.some((f) => f.username === target.username);
  if (!alreadyExists && existingFriends.length >= MAX_FRIENDS_LIMIT) {
    return {
      ok: false,
      status: 400,
      error: `Batas eksklusif maksimal ${MAX_FRIENDS_LIMIT} teman telah tercapai.`,
    };
  }

  // Pastikan grup tercatat
  await createGroup(cleanUser, cleanGroup);

  const nowWib = getWibTimestamp();
  const plainFriendEmail = target.email || cleanEmail;
  const row = {
    username: cleanUser,
    friend_username: target.username,
    friend_email: encryptField(plainFriendEmail),
    group_name: cleanGroup,
    created_at: nowWib,
  };

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/friends?on_conflict=username,friend_username`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
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
        query: 'INSERT INTO friends (username, friend_username, friend_email, group_name, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username, friend_username) DO UPDATE SET group_name = EXCLUDED.group_name',
        params: [row.username, row.friend_username, row.friend_email, row.group_name, row.created_at],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
  } else {
    const rows = readLocalFriendsDb().filter((r) => !(r.username === cleanUser && r.friend_username === target.username));
    rows.unshift(row);
    writeLocalFriendsDb(rows);
  }

  return {
    ok: true,
    friend: { username: target.username, email: plainFriendEmail, groupName: cleanGroup, createdAt: nowWib },
  };
}

export async function removeFriend(username, friendUsername) {
  const cleanUser = String(username || '').trim();
  const cleanFriend = String(friendUsername || '').trim();

  const [friends, groups] = await Promise.all([listFriends(cleanUser), listGroups(cleanUser)]);
  const targetFriend = friends.find((f) => f.username === cleanFriend);
  if (targetFriend) {
    const grp = groups.find((g) => g.name === (targetFriend.groupName || 'Umum'));
    if (grp?.isLocked) {
      return {
        ok: false,
        status: 403,
        error: `Anggota grup "${grp.name}" tidak dapat dihapus setelah 1x24 jam.`,
      };
    }
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/friends?username=eq.${encodeURIComponent(cleanUser)}&friend_username=eq.${encodeURIComponent(cleanFriend)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return { ok: true };
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
    return { ok: true };
  }

  const rows = readLocalFriendsDb().filter(
    (r) => !(r.username === cleanUser && r.friend_username === cleanFriend)
  );
  writeLocalFriendsDb(rows);
  return { ok: true };
}
