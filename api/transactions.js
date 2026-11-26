import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_SECRET = process.env.AUTH_SECRET || 'catatstruk_dev_secret_change_in_prod';

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (!parsed || !parsed.exp || Date.now() > parsed.exp) return null;
  return parsed;
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

function getWibTimestamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
}

function combineTransactionsAndItems(txRows, itemRows) {
  const itemsByTxId = new Map();
  for (const it of itemRows || []) {
    const key = it.transaction_id;
    if (!itemsByTxId.has(key)) itemsByTxId.set(key, []);
    itemsByTxId.get(key).push({
      name: it.item_name,
      qty: Math.max(1, Number(it.qty) || 1),
      price: Math.max(0, Number(it.amount) || 0),
    });
  }

  return (txRows || []).map((r) => ({
    id: r.tx_id,
    date: r.date,
    merchant: r.struk_name,
    category: r.category,
    items: itemsByTxId.get(r.id) || [],
    total: Math.max(0, Number(r.total) || 0),
    paymentMethod: r.payment_method || 'QRIS',
    notes: r.notes || '',
    thumb: '',
    synced: true,
    createdAt: Date.now(),
  }));
}

function readLocalDb() {
  const localDbPath = path.join(process.cwd(), 'db', 'transactions.json');
  if (!fs.existsSync(localDbPath)) return { transactions: [], transaction_items: [] };
  const parsed = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  if (Array.isArray(parsed)) return { transactions: [], transaction_items: [] };
  return {
    transactions: Array.isArray(parsed?.transactions) ? parsed.transactions : [],
    transaction_items: Array.isArray(parsed?.transaction_items) ? parsed.transaction_items : [],
  };
}

function writeLocalDb(db) {
  const localDbPath = path.join(process.cwd(), 'db', 'transactions.json');
  fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2));
}

async function listTransactions(username) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const base = getSupabaseRestBase();
    const headers = buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const [txRes, itemRes] = await Promise.all([
      fetch(
        `${base}/rest/v1/transactions?username=eq.${encodeURIComponent(username)}&select=id,tx_id,date,struk_name,category,total,payment_method,notes&order=date.desc,id.desc`,
        { headers }
      ),
      fetch(
        `${base}/rest/v1/transaction_items?username=eq.${encodeURIComponent(username)}&select=transaction_id,item_name,qty,amount&order=id.asc`,
        { headers }
      ),
    ]);
    if (!txRes.ok || !itemRes.ok) {
      console.error('[transactions] Supabase list error:', txRes.status, itemRes.status);
      throw new Error('DB_ERROR');
    }
    const [txRows, itemRows] = await Promise.all([txRes.json(), itemRes.json()]);
    return combineTransactionsAndItems(txRows, itemRows);
  }

  if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      'Neon-Connection-String': process.env.NEON_DATABASE_URL,
    };
    const [txRes, itemRes] = await Promise.all([
      fetch(`https://${u.hostname}/sql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: 'SELECT id, tx_id, date, struk_name, category, total, payment_method, notes FROM transactions WHERE username = $1 ORDER BY date DESC, id DESC',
          params: [username],
        }),
      }),
      fetch(`https://${u.hostname}/sql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: 'SELECT transaction_id, item_name, qty, amount FROM transaction_items WHERE username = $1 ORDER BY id ASC',
          params: [username],
        }),
      }),
    ]);
    if (!txRes.ok || !itemRes.ok) throw new Error('DB_ERROR');
    const [txData, itemData] = await Promise.all([txRes.json(), itemRes.json()]);
    return combineTransactionsAndItems(txData?.rows, itemData?.rows);
  }

  const db = readLocalDb();
  const txRows = db.transactions.filter((r) => r.username === username);
  const itemRows = db.transaction_items.filter((it) => it.username === username);
  return combineTransactionsAndItems(txRows, itemRows);
}

async function insertMissingTransactions(username, incomingTxs) {
  const existing = await listTransactions(username);
  const existingIds = new Set(existing.map((t) => t.id));
  const nowWib = getWibTimestamp();

  const missingTxs = (Array.isArray(incomingTxs) ? incomingTxs : []).filter(
    (tx) => tx && tx.id && !existingIds.has(String(tx.id))
  );

  if (missingTxs.length === 0) {
    return { inserted: 0, transactions: existing };
  }

  const headerRows = missingTxs.map((tx) => ({
    username,
    tx_id: String(tx.id),
    date: String(tx.date || '').slice(0, 10),
    struk_name: String(tx.merchant || 'Struk'),
    category: String(tx.category || 'Lainnya'),
    total: Math.max(0, Math.round(Number(tx.total) || 0)),
    payment_method: String(tx.paymentMethod || 'QRIS'),
    notes: String(tx.notes || ''),
    created_at: nowWib,
  }));

  const buildItemRowsForTx = (parentId, tx) =>
    (Array.isArray(tx.items) ? tx.items : []).map((it) => ({
      transaction_id: parentId,
      username,
      tx_id: String(tx.id),
      item_name: String(it?.name || 'Item'),
      qty: Math.max(1, Math.round(Number(it?.qty) || 1)),
      amount: Math.max(0, Math.round(Number(it?.price) || 0)),
      created_at: nowWib,
    }));

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const base = getSupabaseRestBase();
    const res = await fetch(`${base}/rest/v1/transactions?on_conflict=username,tx_id`, {
      method: 'POST',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      }),
      body: JSON.stringify(headerRows),
    });
    if (!res.ok) {
      console.error('[transactions] Supabase insert error:', res.status, await res.text());
      throw new Error('DB_ERROR');
    }
    const insertedHeaders = (await res.json()) || [];
    const txByTxId = new Map(missingTxs.map((tx) => [String(tx.id), tx]));
    const itemRows = [];
    for (const h of insertedHeaders) {
      const src = txByTxId.get(String(h.tx_id));
      if (src) itemRows.push(...buildItemRowsForTx(h.id, src));
    }
    if (itemRows.length > 0) {
      const itemRes = await fetch(`${base}/rest/v1/transaction_items`, {
        method: 'POST',
        headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify(itemRows),
      });
      if (!itemRes.ok) {
        console.error('[transactions] Supabase insert items error:', itemRes.status, await itemRes.text());
        throw new Error('DB_ERROR');
      }
    }
  } else if (process.env.NEON_DATABASE_URL) {
    const u = new URL(process.env.NEON_DATABASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      'Neon-Connection-String': process.env.NEON_DATABASE_URL,
    };
    for (let i = 0; i < headerRows.length; i++) {
      const row = headerRows[i];
      const src = missingTxs[i];
      const res = await fetch(`https://${u.hostname}/sql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `INSERT INTO transactions (username, tx_id, date, struk_name, category, total, payment_method, notes, created_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                  ON CONFLICT (username, tx_id) DO NOTHING
                  RETURNING id`,
          params: [
            row.username,
            row.tx_id,
            row.date,
            row.struk_name,
            row.category,
            row.total,
            row.payment_method,
            row.notes,
            row.created_at,
          ],
        }),
      });
      if (!res.ok) throw new Error('DB_ERROR');
      const data = await res.json();
      const parentId = data?.rows?.[0]?.id;
      if (parentId) {
        const items = buildItemRowsForTx(parentId, src);
        for (const it of items) {
          const itemRes = await fetch(`https://${u.hostname}/sql`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: `INSERT INTO transaction_items (transaction_id, username, tx_id, item_name, qty, amount, created_at)
                      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              params: [it.transaction_id, it.username, it.tx_id, it.item_name, it.qty, it.amount, it.created_at],
            }),
          });
          if (!itemRes.ok) throw new Error('DB_ERROR');
        }
      }
    }
  } else {
    const db = readLocalDb();
    let nextTxId = db.transactions.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
    let nextItemId = db.transaction_items.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
    for (let i = 0; i < headerRows.length; i++) {
      const parentId = nextTxId++;
      db.transactions.push({ id: parentId, ...headerRows[i] });
      for (const it of buildItemRowsForTx(parentId, missingTxs[i])) {
        db.transaction_items.push({ id: nextItemId++, ...it });
      }
    }
    writeLocalDb(db);
  }

  const updated = await listTransactions(username);
  return { inserted: headerRows.length, transactions: updated };
}

async function deleteTransaction(username, txId) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/transactions?username=eq.${encodeURIComponent(username)}&tx_id=eq.${encodeURIComponent(txId)}`;
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
        query: 'DELETE FROM transactions WHERE username = $1 AND tx_id = $2',
        params: [username, txId],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return;
  }

  const db = readLocalDb();
  db.transactions = db.transactions.filter((r) => !(r.username === username && r.tx_id === txId));
  db.transaction_items = db.transaction_items.filter((it) => !(it.username === username && it.tx_id === txId));
  writeLocalDb(db);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action = 'list', token, transactions, txId } = body;
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Sesi login berakhir' });
    }

    if (action === 'list') {
      const list = await listTransactions(payload.username);
      return res.status(200).json({ ok: true, transactions: list });
    }

    if (action === 'sync_from_sheet') {
      const result = await insertMissingTransactions(payload.username, transactions);
      return res.status(200).json({ ok: true, ...result });
    }

    if (action === 'delete') {
      await deleteTransaction(payload.username, String(txId || ''));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Aksi tidak dikenal' });
  } catch (err) {
    console.error('[transactions] Internal error:', err);
    return res.status(500).json({
      ok: false,
      error: err.message === 'DB_ERROR' ? 'Gagal mengakses database' : 'Terjadi kesalahan server',
    });
  }
}
