import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseRestBase, buildSupabaseHeaders, getWibTimestamp } from './auth-service.js';

const DB_PATH = path.join(process.cwd(), 'db', 'itineraries.json');

function readLocalItineraries() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalItineraries(list) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), 'utf8');
}

export async function listUserItineraries(username) {
  const cleanUser = String(username || '').trim();
  const base = getSupabaseRestBase();
  if (base) {
    const url = `${base}/rest/v1/itineraries?username=eq.${encodeURIComponent(cleanUser)}&select=plan_id,title,budget_limit,group_name,items&order=id.asc`;
    const res = await fetch(url, { method: 'GET', headers: buildSupabaseHeaders() });
    if (!res.ok) throw new Error(`Supabase itineraries GET failed: ${res.status}`);
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.plan_id,
      title: r.title || 'Plan',
      limit: Number(r.budget_limit) || 0,
      groupName: r.group_name || '',
      items: Array.isArray(r.items) ? r.items : [],
    }));
  }

  return readLocalItineraries().filter((item) => !item.username || item.username === cleanUser);
}

export async function replaceUserItineraries(username, plans) {
  const cleanUser = String(username || '').trim();
  const safePlans = Array.isArray(plans) ? plans : [];
  const base = getSupabaseRestBase();
  const now = getWibTimestamp();

  if (base) {
    // Delete removed plans for user, then upsert current plans
    const delUrl = `${base}/rest/v1/itineraries?username=eq.${encodeURIComponent(cleanUser)}`;
    const delRes = await fetch(delUrl, { method: 'DELETE', headers: buildSupabaseHeaders() });
    if (!delRes.ok) throw new Error(`Supabase itineraries DELETE failed: ${delRes.status}`);

    if (safePlans.length > 0) {
      const payload = safePlans.map((p) => ({
        plan_id: String(p.id || `itin_${Date.now()}`),
        username: cleanUser,
        title: String(p.title || 'Plan'),
        budget_limit: Math.max(0, Number(p.limit) || 0),
        group_name: String(p.groupName || ''),
        items: Array.isArray(p.items) ? p.items : [],
        created_at: now,
        updated_at: now,
      }));
      const insRes = await fetch(`${base}/rest/v1/itineraries`, {
        method: 'POST',
        headers: buildSupabaseHeaders(),
        body: JSON.stringify(payload),
      });
      if (!insRes.ok) throw new Error(`Supabase itineraries POST failed: ${insRes.status}`);
    }
    return safePlans.length;
  }

  const others = readLocalItineraries().filter((item) => item.username && item.username !== cleanUser);
  writeLocalItineraries([
    ...others,
    ...safePlans.map((p) => ({ ...p, username: cleanUser })),
  ]);
  return safePlans.length;
}
