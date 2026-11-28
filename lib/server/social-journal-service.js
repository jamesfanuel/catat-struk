import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseRestBase, buildSupabaseHeaders, getWibTimestamp } from './auth-service.js';

const DB_PATH = path.join(process.cwd(), 'db', 'social_journal.json');

function readLocalJournal() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalJournal(list) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2), 'utf8');
}

export async function listSocialJournalPosts() {
  const base = getSupabaseRestBase();
  if (base) {
    const url = `${base}/rest/v1/social_journal?select=post_id,username,resto,menu,category,price,rating,location,note,tags,created_at_ms&order=created_at_ms.desc&limit=200`;
    const res = await fetch(url, { method: 'GET', headers: buildSupabaseHeaders() });
    if (!res.ok) throw new Error(`Supabase social_journal GET failed: ${res.status}`);
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.post_id,
      username: r.username,
      resto: r.resto,
      menu: r.menu || '',
      cat: r.category || 'fnb',
      price: Number(r.price) || 0,
      rating: Number(r.rating) || 5,
      location: r.location || '',
      note: r.note || '',
      tags: Array.isArray(r.tags) ? r.tags : [],
      createdAt: Number(r.created_at_ms) || 0,
    }));
  }

  return readLocalJournal().sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

export async function createSocialJournalPost(username, post) {
  const cleanUser = String(username || '').trim() || 'premium';
  const postId = String(post.id || `post_${Date.now()}`);
  const createdAtMs = Number(post.createdAt) || Date.now();
  const base = getSupabaseRestBase();

  const normalized = {
    id: postId,
    username: cleanUser,
    resto: String(post.resto || '').trim(),
    menu: String(post.menu || '').trim(),
    cat: String(post.cat || 'fnb'),
    price: Math.max(0, Number(post.price) || 0),
    rating: Math.min(5, Math.max(1, Number(post.rating) || 5)),
    location: String(post.location || '').trim(),
    note: String(post.note || '').trim(),
    tags: Array.isArray(post.tags) ? post.tags : [],
    createdAt: createdAtMs,
  };

  if (base) {
    const res = await fetch(`${base}/rest/v1/social_journal`, {
      method: 'POST',
      headers: buildSupabaseHeaders(),
      body: JSON.stringify({
        post_id: normalized.id,
        username: normalized.username,
        resto: normalized.resto,
        menu: normalized.menu,
        category: normalized.cat,
        price: normalized.price,
        rating: normalized.rating,
        location: normalized.location,
        note: normalized.note,
        tags: normalized.tags,
        created_at_ms: normalized.createdAt,
        created_at: getWibTimestamp(),
      }),
    });
    if (!res.ok) throw new Error(`Supabase social_journal POST failed: ${res.status}`);
    return normalized;
  }

  const all = readLocalJournal().filter((p) => p.id !== normalized.id);
  writeLocalJournal([normalized, ...all]);
  return normalized;
}

export async function deleteSocialJournalPost(postId) {
  const cleanId = String(postId || '').trim();
  if (!cleanId) return;
  const base = getSupabaseRestBase();

  if (base) {
    const res = await fetch(`${base}/rest/v1/social_journal?post_id=eq.${encodeURIComponent(cleanId)}`, {
      method: 'DELETE',
      headers: buildSupabaseHeaders(),
    });
    if (!res.ok) throw new Error(`Supabase social_journal DELETE failed: ${res.status}`);
    return;
  }

  const all = readLocalJournal().filter((p) => p.id !== cleanId);
  writeLocalJournal(all);
}
