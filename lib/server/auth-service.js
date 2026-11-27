import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_SECRET = process.env.AUTH_SECRET || 'catatstruk_dev_secret_change_in_prod';
const ENC_KEY = crypto
  .createHash('sha256')
  .update(process.env.DATA_ENCRYPTION_KEY || AUTH_SECRET)
  .digest();

export function encryptField(plain) {
  const text = String(plain || '').trim();
  if (!text) return '';
  if (text.startsWith('enc$v1$')) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc$v1$${iv.toString('base64url')}$${tag.toString('base64url')}$${encrypted.toString('base64url')}`;
}

export function decryptField(stored) {
  const s = String(stored || '').trim();
  if (!s) return '';
  if (!s.startsWith('enc$v1$')) return s;
  try {
    const parts = s.split('$');
    if (parts.length !== 5) return '';
    const [, , ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENC_KEY,
      Buffer.from(ivB64, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function maskEmail(email) {
  const raw = String(email || '').trim();
  if (!raw || !raw.includes('@')) return raw;
  const [local, domain] = raw.split('@');
  if (!local || !domain) return raw;
  const maskedLocal = local.length <= 2
    ? `${local[0]}****`
    : `${local.slice(0, 2)}****${local.length > 4 ? local.slice(-1) : ''}`;
  return `${maskedLocal}@${domain}`;
}

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(plain, stored) {
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

export function getWibParts(date = new Date()) {
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

export function getWibTimestamp() {
  return getWibParts().timestamp;
}

export function computePremiumMeta(untilRaw) {
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

export function getSupabaseRestBase() {
  return String(process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export function buildSupabaseHeaders(key, extra = {}) {
  const headers = { apikey: key, ...extra };
  if (String(key).startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySignedPayload(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed || !parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createOtpToken({ username, email, otp }) {
  const otpHash = crypto.createHmac('sha256', AUTH_SECRET).update(`${email.toLowerCase()}:${otp}`).digest('hex');
  return signToken({
    type: 'register_otp',
    username: String(username || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    otpHash,
    exp: Date.now() + 10 * 60 * 1000,
  });
}

export function verifyOtpToken({ otpToken, username, email, otp }) {
  const parsed = verifySignedPayload(otpToken);
  if (!parsed || parsed.type !== 'register_otp') return false;
  if (parsed.username !== String(username || '').trim()) return false;
  if (parsed.email !== String(email || '').trim().toLowerCase()) return false;
  const expectedHash = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${parsed.email}:${String(otp || '').trim()}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(parsed.otpHash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function sanitizeUser(row) {
  const meta = computePremiumMeta(row.is_premium_until);
  return {
    username: row.username,
    email: maskEmail(row.email || ''),
    sheet_url: decryptField(row.sheet_url || ''),
    ...meta,
  };
}

export async function getUserByUsername(username) {
  const cleanUser = String(username || '').trim();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}&select=username,email,password,is_premium_until,sheet_url&limit=1`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
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

export async function updateUserEmail(username, email) {
  const cleanUser = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ email: cleanEmail }),
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
        query: 'UPDATE users SET email = $1 WHERE username = $2',
        params: [cleanEmail, cleanUser],
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
    users[idx].email = cleanEmail;
    fs.writeFileSync(localDbPath, JSON.stringify(users, null, 2));
    return;
  }

  throw new Error('DB_NOT_CONFIGURED');
}

export async function getUserByEmail(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,username,email&limit=1`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
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
        query: 'SELECT id, username, email FROM users WHERE LOWER(email) = $1 LIMIT 1',
        params: [cleanEmail],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return data?.rows?.[0] || null;
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localDbPath)) {
    const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    return users.find((u) => String(u.email || '').trim().toLowerCase() === cleanEmail) || null;
  }

  return null;
}

export async function countUsersInDb() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?select=id`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        Prefer: 'count=exact',
      }),
    });
    if (!res.ok) return 0;
    const range = res.headers.get('content-range') || '';
    const match = range.match(/\/(\d+)$/);
    if (match) return Number(match[1]) || 0;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) ? rows.length : 0;
  }

  if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const res = await fetch(`https://${u.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': process.env.NEON_DATABASE_URL,
      },
      body: JSON.stringify({ query: 'SELECT COUNT(*)::int AS cnt FROM users', params: [] }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data?.rows?.[0]?.cnt || 0);
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localDbPath)) {
    const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    return Array.isArray(users) ? users.length : 0;
  }
  return 0;
}

export async function listUsernames() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?select=username&order=username.asc&limit=200`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const rows = await res.json();
    return (rows || []).map((r) => r.username).filter(Boolean);
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
        query: 'SELECT username FROM users ORDER BY username ASC LIMIT 200',
        params: [],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return (data?.rows || []).map((r) => r.username).filter(Boolean);
  }

  const localDbPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localDbPath)) {
    const users = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    return (users || []).map((u) => u.username).filter(Boolean);
  }

  return [];
}

export async function updateUserSheetUrl(username, sheetUrl) {
  const cleanUser = String(username || '').trim();
  const cleanUrl = encryptField(sheetUrl);

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/users?username=eq.${encodeURIComponent(cleanUser)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ sheet_url: cleanUrl }),
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

export async function createUserInDb({ username, email = '', password, sheetUrl = '' }) {
  const cleanUser = String(username || '').trim();
  const cleanEmail = String(email || '').trim();
  const hashedPass = hashPassword(password);
  const cleanUrl = encryptField(sheetUrl);
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
    if (!res.ok) throw new Error('DB_ERROR');
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
  const users = fs.existsSync(localDbPath) ? JSON.parse(fs.readFileSync(localDbPath, 'utf8')) : [];
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
