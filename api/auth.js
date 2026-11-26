import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sendTemplateEmail } from './email.js';

const AUTH_SECRET = process.env.AUTH_SECRET || 'catatstruk_dev_secret_change_in_prod';

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(plain, stored) {
  const s = String(stored || '');
  if (s.startsWith('scrypt$')) {
    const parts = s.split('$');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    const actualBuf = crypto.scryptSync(String(plain), salt, 64);
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  }
  return s === String(plain);
}

function getWibParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = map.hour === '24' ? '00' : map.hour;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    timestamp: `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`,
  };
}

function getWibTimestamp() {
  return getWibParts().timestamp;
}

function computePremiumMeta(untilRaw) {
  const until = untilRaw ? String(untilRaw).slice(0, 10) : '';
  if (!until || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    return {
      is_premium_until: null,
      is_premium: false,
      is_lifetime: false,
      is_expired: false,
      is_expiring_soon: false,
      days_remaining: 0,
    };
  }
  if (until === '9999-01-01') {
    return {
      is_premium_until: '9999-01-01',
      is_premium: true,
      is_lifetime: true,
      is_expired: false,
      is_expiring_soon: false,
      days_remaining: null,
    };
  }

  const todayWib = getWibParts().date;
  const todayMs = Date.parse(`${todayWib}T00:00:00Z`);
  const untilMs = Date.parse(`${until}T00:00:00Z`);
  const diffDays = Math.floor((untilMs - todayMs) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return {
      is_premium_until: until,
      is_premium: false,
      is_lifetime: false,
      is_expired: true,
      is_expiring_soon: false,
      days_remaining: 0,
    };
  }

  return {
    is_premium_until: until,
    is_premium: true,
    is_lifetime: false,
    is_expired: false,
    is_expiring_soon: diffDays <= 7,
    days_remaining: diffDays,
  };
}

function getSupabaseRestBase() {
  return String(process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

function buildSupabaseHeaders(key, extra = {}) {
  const headers = { apikey: key, ...extra };
  if (String(key).startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

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
    const url = `${getSupabaseRestBase()}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}&select=username,email,password,is_premium_until,sheet_url&limit=1`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error('[auth] Supabase select error:', res.status, errBody);
      throw new Error('DB_ERROR');
    }
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
        query: 'SELECT username, email, password, is_premium_until, sheet_url FROM users WHERE username = $1 LIMIT 1',
        params: [cleanUser],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return data?.rows?.[0] || null;
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localDbPath)) {
    const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    return users.find((u) => u.username === cleanUser) || null;
  }

  throw new Error('DB_NOT_CONFIGURED');
}

async function updateUserSheetUrl(username, sheetUrl) {
  const cleanUser = String(username || '').trim();
  const cleanUrl = String(sheetUrl || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ sheet_url: cleanUrl }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error('[auth] Supabase patch error:', res.status, errBody);
      throw new Error('DB_ERROR');
    }
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
    if (!res.ok) throw new Error('DB_ERROR');
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

  throw new Error('DB_NOT_CONFIGURED');
}

async function createUserInDb({ username, email = '', password, sheetUrl = '' }) {
  const cleanUser = String(username || '').trim();
  const cleanEmail = String(email || '').trim();
  const hashedPass = hashPassword(password);
  const cleanUrl = String(sheetUrl || '').trim();
  const createdAt = getWibTimestamp();
  const defaultPremiumUntil = '9999-01-01';

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
        is_premium_until: defaultPremiumUntil,
        sheet_url: cleanUrl,
        created_at: createdAt,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error('[auth] Supabase insert error:', res.status, errBody);
      throw new Error('DB_ERROR');
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
        query: 'INSERT INTO users (username, email, password, is_premium_until, sheet_url, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING username, email, password, is_premium_until, sheet_url',
        params: [cleanUser, cleanEmail, hashedPass, defaultPremiumUntil, cleanUrl, createdAt],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
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
    email: cleanEmail,
    password: hashedPass,
    is_premium_until: defaultPremiumUntil,
    sheet_url: cleanUrl,
    created_at: createdAt,
  };
  users.push(newUser);
  fs.writeFileSync(localDbPath, JSON.stringify(users, null, 2));
  return newUser;
}

function sanitizeUser(row) {
  const meta = computePremiumMeta(row.is_premium_until);
  return {
    username: row.username,
    email: String(row.email || ''),
    sheet_url: String(row.sheet_url || ''),
    ...meta,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action = 'login', username, email = '', password, token, sheetUrl } = body;

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
      const created = await createUserInDb({ username, email, password, sheetUrl });
      const user = sanitizeUser(created);
      const newToken = signToken({
        username: user.username,
        exp: Date.now() + 24 * 60 * 60 * 1000,
      });

      if (user.email) {
        sendTemplateEmail({
          to: user.email,
          template: 'welcome',
          data: {
            username: user.username,
            untilLabel: user.is_lifetime ? 'Premium Selamanya' : (user.is_premium_until || 'Reguler'),
          },
        }).catch((e) => console.error('[auth] Welcome email error:', e));
      }

      return res.status(200).json({ ok: true, token: newToken, user });
    }

    const row = await getUserByUsername(username);
    if (!row) {
      return res.status(404).json({
        ok: false,
        notRegistered: true,
        error: 'Akun tidak ditemukan. Silakan daftar akun baru terlebih dahulu.',
      });
    }
    if (!verifyPassword(password, row.password)) {
      return res.status(401).json({ ok: false, error: 'Username atau password salah.' });
    }

    const user = sanitizeUser(row);
    const newToken = signToken({
      username: user.username,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Kirim email pengingat otomatis jika masa Premium <= 7 hari lagi
    if (user.email && user.is_expiring_soon) {
      sendTemplateEmail({
        to: user.email,
        template: 'expiry_reminder',
        data: {
          username: user.username,
          untilLabel: user.is_premium_until,
          daysRemaining: user.days_remaining,
        },
      }).catch((e) => console.error('[auth] Expiry email error:', e));
    }

    return res.status(200).json({ ok: true, token: newToken, user });
  } catch (err) {
    console.error('[auth] Internal error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Terjadi gangguan pada server. Silakan coba beberapa saat lagi.',
    });
  }
}
