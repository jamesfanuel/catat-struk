import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_SECRET = process.env.AUTH_SECRET || 'catatstruk_dev_secret_change_in_prod';

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (!parsed || !parsed.exp || Date.now() > parsed.exp) return null;
  return parsed;
}

async function getUserByUsername(username) {
  const cleanUser = String(username || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}&select=username,password,is_premium,sheet_url&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) throw new Error('Gagal query database Supabase');
    const rows = await res.json();
    return rows?.[0] || null;
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
        query: 'SELECT username, password, is_premium, sheet_url FROM users WHERE username = $1 LIMIT 1',
        params: [cleanUser],
      }),
    });
    if (!res.ok) throw new Error('Gagal query database Neon');
    const data = await res.json();
    return data?.rows?.[0] || null;
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localDbPath)) {
    const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    return users.find((u) => u.username === cleanUser) || null;
  }

  throw new Error('Database belum dikonfigurasi.');
}

async function updateUserSheetUrl(username, sheetUrl) {
  const cleanUser = String(username || '').trim();
  const cleanUrl = String(sheetUrl || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sheet_url: cleanUrl }),
    });
    if (!res.ok) throw new Error('Gagal menyimpan link Sheet ke Supabase');
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
        query: 'UPDATE users SET sheet_url = $1 WHERE username = $2',
        params: [cleanUrl, cleanUser],
      }),
    });
    if (!res.ok) throw new Error('Gagal menyimpan link Sheet ke Neon');
    return;
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localDbPath)) {
    const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    const idx = users.findIndex((u) => u.username === cleanUser);
    if (idx === -1) throw new Error('User tidak ditemukan');
    users[idx].sheet_url = cleanUrl;
    fs.writeFileSync(localDbPath, JSON.stringify(users, null, 2));
    return;
  }

  throw new Error('Database belum dikonfigurasi.');
}

async function createUserInDb({ username, password, sheetUrl = '' }) {
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '');
  const cleanUrl = String(sheetUrl || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        username: cleanUser,
        password: cleanPass,
        is_premium: 'Y',
        sheet_url: cleanUrl,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || 'Gagal mendaftar di Supabase');
    }
    const rows = await res.json();
    return rows?.[0];
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
        query: 'INSERT INTO users (username, password, is_premium, sheet_url) VALUES ($1, $2, $3, $4) RETURNING username, password, is_premium, sheet_url',
        params: [cleanUser, cleanPass, 'Y', cleanUrl],
      }),
    });
    if (!res.ok) throw new Error('Gagal mendaftar di Neon');
    const data = await res.json();
    return data?.rows?.[0];
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  const users = fs.existsSync(localDbPath)
    ? JSON.parse(fs.readFileSync(localDbPath, 'utf8'))
    : [];
  if (users.some((u) => u.username === cleanUser)) {
    throw new Error('Username sudah terdaftar.');
  }
  const newUser = {
    username: cleanUser,
    password: cleanPass,
    is_premium: 'Y',
    sheet_url: cleanUrl,
  };
  users.push(newUser);
  fs.writeFileSync(localDbPath, JSON.stringify(users, null, 2));
  return newUser;
}

function sanitizeUser(row) {
  return {
    username: row.username,
    is_premium: row.is_premium === 'N' ? 'N' : 'Y',
    sheet_url: String(row.sheet_url || ''),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action = 'login', username, password, token, sheetUrl } = body;

    if (action === 'verify') {
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ ok: false, error: 'Sesi login berakhir' });
      const row = await getUserByUsername(payload.username);
      if (!row) return res.status(401).json({ ok: false, error: 'User tidak ditemukan' });
      return res.status(200).json({ ok: true, user: sanitizeUser(row) });
    }

    if (action === 'save_sheet') {
      const payload = verifyToken(token);
      if (!payload) return res.status(401).json({ ok: false, error: 'Sesi login berakhir' });
      await updateUserSheetUrl(payload.username, sheetUrl);
      const updated = await getUserByUsername(payload.username);
      return res.status(200).json({ ok: true, user: sanitizeUser(updated) });
    }

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Username dan password wajib diisi.' });
    }

    if (action === 'register') {
      const existing = await getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ ok: false, error: 'Username sudah terdaftar. Silakan login.' });
      }
      const created = await createUserInDb({ username, password, sheetUrl });
      const user = sanitizeUser(created);
      const newToken = signToken({
        username: user.username,
        is_premium: user.is_premium,
        exp: Date.now() + 24 * 60 * 60 * 1000,
      });
      return res.status(200).json({ ok: true, token: newToken, user });
    }

    const row = await getUserByUsername(username);
    if (!row) {
      return res.status(404).json({
        ok: false,
        notRegistered: true,
        error: 'Akun belum terdaftar. Silakan klik "Daftar & Masuk" untuk membuat akun baru.',
      });
    }
    if (row.password !== String(password)) {
      return res.status(401).json({ ok: false, error: 'Password salah.' });
    }

    const user = sanitizeUser(row);
    const newToken = signToken({
      username: user.username,
      is_premium: user.is_premium,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ ok: true, token: newToken, user });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Auth error' });
  }
}
