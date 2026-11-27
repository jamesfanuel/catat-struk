import fs from 'node:fs';
import path from 'node:path';
import {
  getSupabaseRestBase,
  buildSupabaseHeaders,
  getWibTimestamp,
  encryptField,
  decryptField,
} from './auth-service.js';

function parseSplitDetails(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function decryptJsonPayload(stored) {
  if (!stored) return null;
  try {
    const plain = decryptField(stored);
    if (!plain) return null;
    return JSON.parse(plain);
  } catch {
    return null;
  }
}

function combineTransactionsAndItems(txRows, itemRows) {
  const itemsByTxId = new Map();
  for (const it of itemRows || []) {
    const key = it.transaction_id;
    if (!itemsByTxId.has(key)) itemsByTxId.set(key, []);
    const dec = decryptJsonPayload(it.encrypted_payload);
    itemsByTxId.get(key).push({
      name: dec ? String(dec.name || '') : it.item_name,
      qty: Math.max(1, Number(dec ? dec.qty : it.qty) || 1),
      price: Math.max(0, Number(dec ? dec.price : it.amount) || 0),
      owner: dec ? String(dec.owner || '') : (it.owner || ''),
      ownerUsername: dec ? String(dec.ownerUsername || '') : (it.owner_username || ''),
      ownerName: dec ? String(dec.ownerName || '') : (it.owner_name || ''),
    });
  }

  return (txRows || [])
    .map((r) => {
      const dec = decryptJsonPayload(r.encrypted_payload);
      return {
        id: r.tx_id,
        date: dec ? String(dec.date || '') : r.date,
        merchant: dec ? String(dec.merchant || 'Struk') : r.struk_name,
        category: dec ? String(dec.category || 'Lainnya') : r.category,
        items: itemsByTxId.get(r.id) || [],
        total: Math.max(0, Number(dec ? dec.total : r.total) || 0),
        tax: Math.max(0, Number(dec ? dec.tax : r.tax) || 0),
        service: Math.max(0, Number(dec ? dec.service : r.service) || 0),
        paymentMethod: dec ? String(dec.paymentMethod || 'QRIS') : (r.payment_method || 'QRIS'),
        notes: dec ? String(dec.notes || '') : (r.notes || ''),
        status: r.status || 'expense',
        sharedBy: dec ? String(dec.sharedBy || '') : (r.shared_by || ''),
        sourceTxId: dec ? String(dec.sourceTxId || '') : (r.source_tx_id || ''),
        splitDetails: dec ? parseSplitDetails(dec.splitDetails) : parseSplitDetails(r.split_details),
        thumb: '',
        synced: true,
        createdAt: Date.now(),
      };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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

export async function listTransactions(username) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const base = getSupabaseRestBase();
    const headers = buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const [txRes, itemRes] = await Promise.all([
      fetch(
        `${base}/rest/v1/transactions?username=eq.${encodeURIComponent(username)}&select=id,tx_id,date,struk_name,category,total,tax,service,payment_method,notes,status,shared_by,source_tx_id,split_details,encrypted_payload&order=id.desc`,
        { headers }
      ),
      fetch(
        `${base}/rest/v1/transaction_items?username=eq.${encodeURIComponent(username)}&select=transaction_id,item_name,qty,amount,owner,owner_username,owner_name,encrypted_payload&order=id.asc`,
        { headers }
      ),
    ]);
    if (!txRes.ok || !itemRes.ok) throw new Error('DB_ERROR');
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
          query: 'SELECT id, tx_id, date, struk_name, category, total, tax, service, payment_method, notes, status, shared_by, source_tx_id, split_details, encrypted_payload FROM transactions WHERE username = $1 ORDER BY id DESC',
          params: [username],
        }),
      }),
      fetch(`https://${u.hostname}/sql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: 'SELECT transaction_id, item_name, qty, amount, owner, owner_username, owner_name, encrypted_payload FROM transaction_items WHERE username = $1 ORDER BY id ASC',
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

async function getExistingUsernamesSet(usernames) {
  const clean = [...new Set((usernames || []).map((u) => String(u || '').trim()).filter(Boolean))];
  if (clean.length === 0) return new Set();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const base = getSupabaseRestBase();
    const inList = clean.map((u) => `"${u.replace(/"/g, '\\"')}"`).join(',');
    const res = await fetch(
      `${base}/rest/v1/users?username=in.(${encodeURIComponent(inList)})&select=username`,
      { headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY) }
    );
    if (!res.ok) throw new Error('DB_ERROR');
    const rows = await res.json();
    return new Set((rows || []).map((r) => r.username));
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
        query: 'SELECT username FROM users WHERE username = ANY($1)',
        params: [clean],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return new Set((data?.rows || []).map((r) => r.username));
  }

  const localUsersPath = path.join(process.cwd(), 'db', 'users.json');
  if (fs.existsSync(localUsersPath)) {
    const users = JSON.parse(fs.readFileSync(localUsersPath, 'utf8'));
    return new Set((users || []).map((u) => u.username).filter((name) => clean.includes(name)));
  }

  return new Set();
}

export async function insertMissingTransactions(username, incomingTxs) {
  const existing = await listTransactions(username);
  const existingIds = new Set(existing.map((t) => t.id));
  const nowWib = getWibTimestamp();

  const missingTxs = (Array.isArray(incomingTxs) ? incomingTxs : []).filter(
    (tx) => tx && tx.id && !existingIds.has(String(tx.id))
  );

  if (missingTxs.length === 0) {
    return { inserted: 0, transactions: existing };
  }

  const headerRows = missingTxs.map((tx) => {
    const encryptedPayload = encryptField(
      JSON.stringify({
        date: String(tx.date || '').slice(0, 10),
        merchant: String(tx.merchant || 'Struk'),
        category: String(tx.category || 'Lainnya'),
        total: Math.max(0, Math.round(Number(tx.total) || 0)),
        tax: Math.max(0, Math.round(Number(tx.tax) || 0)),
        service: Math.max(0, Math.round(Number(tx.service) || 0)),
        paymentMethod: String(tx.paymentMethod || 'QRIS'),
        notes: String(tx.notes || ''),
        sharedBy: String(tx.sharedBy || ''),
        sourceTxId: String(tx.sourceTxId || ''),
        splitDetails: Array.isArray(tx.splitDetails) ? tx.splitDetails : [],
      })
    );
    return {
      username,
      tx_id: String(tx.id),
      date: '****-**-**',
      struk_name: '[ENCRYPTED]',
      category: '[ENCRYPTED]',
      total: 0,
      tax: 0,
      service: 0,
      payment_method: '[ENCRYPTED]',
      notes: '',
      status: tx.status === 'outstanding' ? 'outstanding' : 'expense',
      shared_by: '',
      source_tx_id: '',
      split_details: '[]',
      encrypted_payload: encryptedPayload,
      created_at: nowWib,
    };
  });

  const buildItemRowsForTx = (parentId, tx) =>
    (Array.isArray(tx.items) ? tx.items : []).map((it) => {
      const encryptedPayload = encryptField(
        JSON.stringify({
          name: String(it?.name || 'Item'),
          qty: Math.max(1, Math.round(Number(it?.qty) || 1)),
          price: Math.max(0, Math.round(Number(it?.price) || 0)),
          owner: String(it?.owner || ''),
          ownerUsername: String(it?.ownerUsername || ''),
          ownerName: String(it?.ownerName || ''),
        })
      );
      return {
        transaction_id: parentId,
        username,
        tx_id: String(tx.id),
        item_name: '[ENCRYPTED]',
        qty: 1,
        amount: 0,
        owner: '',
        owner_username: '',
        owner_name: '',
        encrypted_payload: encryptedPayload,
        created_at: nowWib,
      };
    });

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
    if (!res.ok) throw new Error('DB_ERROR');
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
      if (!itemRes.ok) throw new Error('DB_ERROR');
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
          query: `INSERT INTO transactions (username, tx_id, date, struk_name, category, total, tax, service, payment_method, notes, status, shared_by, source_tx_id, split_details, encrypted_payload, created_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                  ON CONFLICT (username, tx_id) DO NOTHING
                  RETURNING id`,
          params: [
            row.username, row.tx_id, row.date, row.struk_name, row.category,
            row.total, row.tax, row.service, row.payment_method, row.notes,
            row.status, row.shared_by, row.source_tx_id, row.split_details, row.encrypted_payload, row.created_at,
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
              query: `INSERT INTO transaction_items (transaction_id, username, tx_id, item_name, qty, amount, owner, owner_username, owner_name, encrypted_payload, created_at)
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              params: [it.transaction_id, it.username, it.tx_id, it.item_name, it.qty, it.amount, it.owner, it.owner_username, it.owner_name, it.encrypted_payload, it.created_at],
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

export async function deleteTransaction(username, txId) {
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

export async function acceptOutstandingTransaction(username, txId) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/transactions?username=eq.${encodeURIComponent(username)}&tx_id=eq.${encodeURIComponent(txId)}&status=eq.outstanding`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({ status: 'expense' }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    return await res.json();
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
        query: "UPDATE transactions SET status = 'expense' WHERE username = $1 AND tx_id = $2 AND status = 'outstanding' RETURNING id",
        params: [username, txId],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return data?.rows || [];
  }

  const db = readLocalDb();
  const updated = [];
  for (const r of db.transactions) {
    if (r.username === username && r.tx_id === txId && (r.status || 'expense') === 'outstanding') {
      r.status = 'expense';
      updated.push(r);
    }
  }
  writeLocalDb(db);
  return updated;
}

export async function shareSplitTransactions(senderUsername, shares) {
  const validShares = Array.isArray(shares)
    ? shares.filter((s) => s && s.targetUsername && s.tx && String(s.targetUsername).trim() !== senderUsername)
    : [];
  if (validShares.length === 0) return { sharedCount: 0, missingUsers: [] };

  const targetNames = validShares.map((s) => String(s.targetUsername).trim());
  const existingUsers = await getExistingUsernamesSet(targetNames);
  const missingUsers = [...new Set(targetNames.filter((name) => !existingUsers.has(name)))];

  let sharedCount = 0;
  for (const share of validShares) {
    const targetUser = String(share.targetUsername).trim();
    if (!existingUsers.has(targetUser)) continue;
    const shareTx = {
      ...share.tx,
      status: 'outstanding',
      sharedBy: senderUsername,
      sourceTxId: String(share.tx.sourceTxId || share.tx.id || ''),
    };
    const result = await insertMissingTransactions(targetUser, [shareTx]);
    sharedCount += result.inserted || 0;
  }

  return { sharedCount, missingUsers };
}

export async function upsertTransaction(username, tx) {
  if (!tx || !tx.id) return { transactions: await listTransactions(username) };
  await deleteTransaction(username, String(tx.id));
  return insertMissingTransactions(username, [tx]);
}
