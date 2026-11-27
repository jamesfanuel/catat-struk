import fs from 'node:fs';
import path from 'node:path';
import {
  encryptField,
  decryptField,
  hashPassword,
  computePremiumMeta,
  getWibTimestamp,
  getSupabaseRestBase,
  buildSupabaseHeaders,
  signToken,
} from './auth-service.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || 'admin123';

export function verifyAdminPassword(password) {
  return String(password || '') === ADMIN_PASSWORD;
}

export function signAdminToken() {
  return signToken({ role: 'admin', exp: Date.now() + 12 * 60 * 60 * 1000 });
}

function normalizePremiumUntil(val) {
  const s = String(val ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function formatAdminUser(row) {
  const meta = computePremiumMeta(row.is_premium_until);
  return {
    id: row.id ?? null,
    username: row.username,
    email: decryptField(row.email || ''),
    sheet_url: decryptField(row.sheet_url || ''),
    created_at: row.created_at || '',
    ...meta,
  };
}

export async function fetchAllUsers() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?select=id,username,email,is_premium_until,sheet_url,created_at&order=id.desc`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const rows = await res.json();
    return (rows || []).map(formatAdminUser);
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
        query: 'SELECT id, username, email, is_premium_until, sheet_url, created_at FROM users ORDER BY id DESC',
        params: [],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return (data?.rows || []).map(formatAdminUser);
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localDbPath)) {
    const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    return (users || []).map((u, idx) => formatAdminUser({ id: u.id ?? idx + 1, ...u }));
  }

  throw new Error('DB_NOT_CONFIGURED');
}

export async function createUserAdmin({ username, email = '', password, is_premium_until = '9999-01-01', sheet_url = '' }) {
  const cleanUser = String(username || '').trim();
  const cleanEmail = encryptField(String(email || '').trim().toLowerCase());
  const hashedPass = hashPassword(password);
  const cleanUrl = encryptField(sheet_url);
  const premiumUntil = normalizePremiumUntil(is_premium_until);
  const createdAt = getWibTimestamp();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({
        username: cleanUser,
        email: cleanEmail,
        password: hashedPass,
        is_premium_until: premiumUntil,
        sheet_url: cleanUrl,
        created_at: createdAt,
      }),
    });
    if (res.status === 409) throw new Error('USERNAME_EXISTS');
    if (!res.ok) throw new Error('DB_ERROR');
    const rows = await res.json();
    return formatAdminUser(rows?.[0] || {});
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
        query: 'INSERT INTO users (username, email, password, is_premium_until, sheet_url, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, is_premium_until, sheet_url, created_at',
        params: [cleanUser, cleanEmail, hashedPass, premiumUntil, cleanUrl, createdAt],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return formatAdminUser(data?.rows?.[0] || {});
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  const users = fs.existsSync(localDbPath) ? JSON.parse(fs.readFileSync(localDbPath, 'utf8')) : [];
  if (users.some((u) => u.username === cleanUser)) throw new Error('USERNAME_EXISTS');
  const newUser = {
    username: cleanUser,
    email: cleanEmail,
    password: hashedPass,
    is_premium_until: premiumUntil,
    sheet_url: cleanUrl,
    created_at: createdAt,
  };
  users.push(newUser);
  fs.writeFileSync(localDbPath, JSON.stringify(users, null, 2));
  return formatAdminUser(newUser);
}

export async function updateUserAdmin({ username, email = '', password = '', is_premium_until, sheet_url = '' }) {
  const cleanUser = String(username || '').trim();
  const cleanEmail = encryptField(String(email || '').trim().toLowerCase());
  const cleanUrl = encryptField(sheet_url);
  const premiumUntil = normalizePremiumUntil(is_premium_until);
  const updateFields = {
    email: cleanEmail,
    is_premium_until: premiumUntil,
    sheet_url: cleanUrl,
  };
  if (String(password || '').trim()) {
    updateFields.password = hashPassword(password);
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify(updateFields),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const rows = await res.json();
    if (!rows?.[0]) throw new Error('USER_NOT_FOUND');
    return formatAdminUser(rows[0]);
  }

  if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const hasPass = Boolean(updateFields.password);
    const query = hasPass
      ? 'UPDATE users SET email = $1, is_premium_until = $2, sheet_url = $3, password = $4 WHERE username = $5 RETURNING id, username, email, is_premium_until, sheet_url, created_at'
      : 'UPDATE users SET email = $1, is_premium_until = $2, sheet_url = $3 WHERE username = $4 RETURNING id, username, email, is_premium_until, sheet_url, created_at';
    const params = hasPass
      ? [cleanEmail, premiumUntil, cleanUrl, updateFields.password, cleanUser]
      : [cleanEmail, premiumUntil, cleanUrl, cleanUser];
    const res = await fetch(`https://${u.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': process.env.NEON_DATABASE_URL,
      },
      body: JSON.stringify({ query, params }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    if (!data?.rows?.[0]) throw new Error('USER_NOT_FOUND');
    return formatAdminUser(data.rows[0]);
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (!fs.existsSync(localDbPath)) throw new Error('USER_NOT_FOUND');
  const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  const idx = users.findIndex((u) => u.username === cleanUser);
  if (idx === -1) throw new Error('USER_NOT_FOUND');
  users[idx] = { ...users[idx], ...updateFields };
  fs.writeFileSync(localDbPath, JSON.stringify(users, null, 2));
  return formatAdminUser(users[idx]);
}

export async function deleteUserAdmin(username) {
  const cleanUser = String(username || '').trim();
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}`;
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
        query: 'DELETE FROM users WHERE username = $1',
        params: [cleanUser],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return;
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (!fs.existsSync(localDbPath)) return;
  const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  fs.writeFileSync(
    localDbPath,
    JSON.stringify(users.filter((u) => u.username !== cleanUser), null, 2)
  );
}
