import crypto from 'node:crypto';

const SHEET_URL_RE = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)(?:\/.*)?$/;
const HEADERS = [
  'ID',
  'Tanggal',
  'Toko',
  'Kategori',
  'Item',
  'Total (Rp)',
  'Metode Bayar',
  'Catatan',
  'Synced At',
];

function extractSheetId(url) {
  const match = String(url || '').trim().match(SHEET_URL_RE);
  return match ? match[1] : null;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function normalizePrivateKey(raw) {
  let key = String(raw || '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
}

async function getGoogleAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );
  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = base64Url(signer.sign(normalizePrivateKey(privateKey)));

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || 'Gagal autentikasi Google Service Account');
  }
  return tokenJson.access_token;
}

async function ensureSheetHeader(sheetId, token, action = 'append') {
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:I1`;
  const res = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const rawMsg = err?.error?.message || '';
    if (rawMsg.toLowerCase().includes('permission')) {
      throw new Error(
        `Akses ditolak oleh Google Sheet. Jika memakai Service Account, tambahkan email (${process.env.GOOGLE_CLIENT_EMAIL}) sebagai Editor di menu Share Google Sheet, ATAU gunakan APPS_SCRIPT_BRIDGE_URL di .env/Vercel agar cukup link publik saja.`
      );
    }
    throw new Error(
      rawMsg ||
      'Tidak bisa mengakses Google Sheet. Pastikan akses link sudah diset ke "Anyone with the link -> Editor".'
    );
  }
  const data = await res.json();
  if (!data.values || data.values.length === 0) {
    if (action === 'validate') return { empty: true };
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:I1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [HEADERS] }),
      }
    );
    return { empty: true };
  }
  const row1 = data.values[0] || [];
  const matches = HEADERS.every((h, idx) => String(row1[idx] || '').trim() === h);
  if (!matches) {
    throw new Error(
      `Format Google Sheet tidak sesuai. Gunakan Google Sheet kosong atau Sheet dengan header: ${HEADERS.join(', ')}`
    );
  }
  return { empty: false };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, sheetUrl, rows } = body;
    const sheetId = extractSheetId(sheetUrl);

    if (!sheetId) {
      return res.status(400).json({
        ok: false,
        error: 'Link Google Sheet tidak valid. Gunakan link https://docs.google.com/spreadsheets/d/...',
      });
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const bridgeUrl = process.env.APPS_SCRIPT_BRIDGE_URL;

    // Mode 1 (Prioritas untuk Link Publik): Apps Script Bridge URL
    // Bekerja langsung dengan link Google Sheet apa saja yang diset "Anyone with the link -> Editor"
    if (bridgeUrl) {
      if (action === 'import') {
        const r = await fetch(`${bridgeUrl}?sheetUrl=${encodeURIComponent(sheetUrl)}`);
        const data = await r.json().catch(() => ({ ok: false, error: 'Respon Apps Script tidak valid' }));
        return res.status(r.ok ? 200 : 400).json(data);
      }
      const r = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, sheetUrl, rows }),
      });
      const data = await r.json().catch(() => ({ ok: r.ok }));
      return res.status(r.ok && data.ok !== false ? 200 : 400).json(data);
    }

    // Mode 2: Google Service Account (perlu share sheet ke clientEmail sebagai Editor)
    if (clientEmail && privateKey) {
      const token = await getGoogleAccessToken(clientEmail, privateKey);
      await ensureSheetHeader(sheetId, token, action);

      if (action === 'ping' || action === 'validate') {
        return res.status(200).json({ ok: true, message: 'Google Sheet terhubung!' });
      }

      if (action === 'import') {
        const getRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A2:I`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const getJson = await getRes.json();
        const mapped = (getJson.values || [])
          .filter((r) => r[0] || r[2])
          .map((r, idx) => ({
            id: String(r[0] || `gs_${idx + 2}`),
            date: String(r[1] || '').slice(0, 10),
            merchant: String(r[2] || 'Struk'),
            category: String(r[3] || 'Lainnya'),
            itemsText: String(r[4] || ''),
            total: Math.max(0, Number(String(r[5] || '0').replace(/[^\d]/g, '')) || 0),
            paymentMethod: String(r[6] || 'QRIS'),
            notes: String(r[7] || ''),
          }));
        return res.status(200).json({ ok: true, rows: mapped });
      }

      const list = Array.isArray(rows) ? rows : [];
      if (list.length === 0) return res.status(200).json({ ok: true, count: 0 });

      const nowIso = new Date().toISOString();
      const values = list.map((r) => [
        String(r.id || ''),
        String(r.date || ''),
        String(r.merchant || ''),
        String(r.category || ''),
        String(r.itemsText || ''),
        Math.max(0, Number(r.total) || 0),
        String(r.paymentMethod || ''),
        String(r.notes || ''),
        String(r.syncedAt || nowIso),
      ]);

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      if (!appendRes.ok) {
        const err = await appendRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Gagal menulis ke Google Sheet');
      }
      return res.status(200).json({ ok: true, count: values.length });
    }

    return res.status(503).json({
      ok: false,
      error:
        'Server Vercel belum dikonfigurasi. Set GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY (atau APPS_SCRIPT_BRIDGE_URL) di Environment Variables Vercel.',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Internal error' });
  }
}
