import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseRestBase, buildSupabaseHeaders, getWibTimestamp } from './auth-service.js';

function parseVersionNumber(verStr) {
  const m = String(verStr || '').match(/v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!m) return [0, 0, 0];
  return [Number(m[1] || 0), Number(m[2] || 0), Number(m[3] || 0)];
}

function compareVersionsDesc(a, b) {
  const pa = parseVersionNumber(a?.version);
  const pb = parseVersionNumber(b?.version);
  for (let i = 0; i < 3; i += 1) {
    if (pb[i] !== pa[i]) return pb[i] - pa[i];
  }
  return 0;
}

function normalizeItems(rawItems) {
  let list = rawItems;
  if (typeof rawItems === 'string') {
    try {
      list = JSON.parse(rawItems);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((it) => ({
    title: String(it?.title || ''),
    details: Array.isArray(it?.details) ? it.details.map((d) => String(d)) : [],
  }));
}

function readLocalVersionHistory() {
  const localPath = path.join(process.cwd(), 'db', 'version_history.json');
  if (!fs.existsSync(localPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        version: String(row.version || ''),
        title: String(row.title || ''),
        items: normalizeItems(row.items),
        released_at: String(row.released_at || ''),
      }))
      .sort(compareVersionsDesc);
  } catch {
    return [];
  }
}

export async function listVersionHistory() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const base = getSupabaseRestBase();
      const res = await fetch(
        `${base}/rest/v1/version_history?select=id,version,title,items,released_at&order=id.desc`,
        { headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY) }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows
            .map((r) => ({
              version: String(r.version || ''),
              title: String(r.title || ''),
              items: normalizeItems(r.items),
              released_at: String(r.released_at || ''),
            }))
            .sort(compareVersionsDesc);
        }
      }
    } catch {
      // Fallback ke data lokal jika tabel belum dibuat di Supabase
    }
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
          query: 'SELECT id, version, title, items, released_at FROM version_history ORDER BY id DESC',
          params: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rows = data?.rows || [];
        if (rows.length > 0) {
          return rows
            .map((r) => ({
              version: String(r.version || ''),
              title: String(r.title || ''),
              items: normalizeItems(r.items),
              released_at: String(r.released_at || ''),
            }))
            .sort(compareVersionsDesc);
        }
      }
    } catch {
      // Fallback ke data lokal jika tabel belum dibuat di Neon
    }
  }

  return readLocalVersionHistory();
}

export async function saveVersionEntry({ version, title, items }) {
  const cleanVersion = String(version || '').trim();
  const cleanTitle = String(title || '').trim();
  const cleanItems = normalizeItems(items);
  const releasedAt = getWibTimestamp();
  if (!cleanVersion || !cleanTitle) {
    throw new Error('Version dan title wajib diisi.');
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const base = getSupabaseRestBase();
    const res = await fetch(`${base}/rest/v1/version_history?on_conflict=version`, {
      method: 'POST',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify({
        version: cleanVersion,
        title: cleanTitle,
        items: cleanItems,
        released_at: releasedAt,
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return listVersionHistory();
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
        query: `INSERT INTO version_history (version, title, items, released_at)
                VALUES ($1, $2, $3::jsonb, $4)
                ON CONFLICT (version) DO UPDATE SET title = EXCLUDED.title, items = EXCLUDED.items, released_at = EXCLUDED.released_at`,
        params: [cleanVersion, cleanTitle, JSON.stringify(cleanItems), releasedAt],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return listVersionHistory();
  }

  const localPath = path.join(process.cwd(), 'db', 'version_history.json');
  const existing = readLocalVersionHistory();
  const filtered = existing.filter((r) => r.version !== cleanVersion);
  filtered.unshift({
    id: filtered.length + 1,
    version: cleanVersion,
    title: cleanTitle,
    items: cleanItems,
    released_at: releasedAt,
  });
  fs.writeFileSync(localPath, JSON.stringify(filtered.sort(compareVersionsDesc), null, 2));
  return listVersionHistory();
}
