import fs from 'node:fs';
import path from 'node:path';
import {
  getSupabaseRestBase,
  buildSupabaseHeaders,
  getWibTimestamp,
} from './auth-service.js';

function readLocalAuditLogs() {
  const p = path.join(process.cwd(), 'db', 'audit_logs.json');
  if (!fs.existsSync(p)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAuditLogs(rows) {
  const p = path.join(process.cwd(), 'db', 'audit_logs.json');
  fs.writeFileSync(p, JSON.stringify(rows.slice(0, 1000), null, 2));
}

export function extractRequestMeta(request) {
  if (!request?.headers) return { ipAddress: '', userAgent: '' };
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const realIp = request.headers.get('x-real-ip') || '';
  const ipAddress = (forwarded.split(',')[0] || realIp || '').trim().slice(0, 64);
  const userAgent = (request.headers.get('user-agent') || '').trim().slice(0, 255);
  return { ipAddress, userAgent };
}

export async function writeAuditLog({
  actor = '',
  action,
  target = '',
  status = 'success',
  details = '',
  request = null,
}) {
  if (!action) return;
  try {
    const { ipAddress, userAgent } = extractRequestMeta(request);
    const detailsText = typeof details === 'string' ? details : JSON.stringify(details || '');
    const row = {
      actor: String(actor || '').slice(0, 64),
      action: String(action).slice(0, 64),
      target: String(target || '').slice(0, 128),
      status: String(status || 'success').slice(0, 24),
      details: detailsText.slice(0, 1000),
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: getWibTimestamp(),
    };

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const url = `${getSupabaseRestBase()}/rest/v1/audit_logs`;
      const res = await fetch(url, {
        method: 'POST',
        headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY, {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify(row),
      });
      if (!res.ok) {
        console.error('[audit] Supabase insert error:', res.status, await res.text());
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
          query: `INSERT INTO audit_logs (actor, action, target, status, details, ip_address, user_agent, created_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          params: [
            row.actor, row.action, row.target, row.status,
            row.details, row.ip_address, row.user_agent, row.created_at,
          ],
        }),
      });
      if (!res.ok) {
        console.error('[audit] Neon insert error:', res.status);
      }
      return;
    }

    const logs = readLocalAuditLogs();
    const nextId = logs.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
    logs.unshift({ id: nextId, ...row });
    writeLocalAuditLogs(logs);
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}

export async function listAuditLogs({ limit = 100 } = {}) {
  const safeLimit = Math.min(300, Math.max(1, Number(limit) || 100));

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const url = `${getSupabaseRestBase()}/rest/v1/audit_logs?select=id,actor,action,target,status,details,ip_address,created_at&order=id.desc&limit=${safeLimit}`;
    const res = await fetch(url, {
      headers: buildSupabaseHeaders(process.env.SUPABASE_SERVICE_ROLE_KEY),
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
        query: 'SELECT id, actor, action, target, status, details, ip_address, created_at FROM audit_logs ORDER BY id DESC LIMIT $1',
        params: [safeLimit],
      }),
    });
    if (!res.ok) throw new Error('DB_ERROR');
    const data = await res.json();
    return data?.rows || [];
  }

  return readLocalAuditLogs().slice(0, safeLimit);
}
