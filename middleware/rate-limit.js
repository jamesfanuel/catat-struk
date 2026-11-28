import { NextResponse } from 'next/server.js';

/**
 * In-memory Rate Limiter & Progressive Throttling (Sliding Window per IP + Bucket).
 * Catatan: Untuk multi-instance serverless skala besar dapat dipasangkan Redis/Upstash,
 * namun in-memory store ini sudah efektif memblokir burst/brute-force per instance Edge.
 */
const WINDOW_MS = 60 * 1000; // 1 menit
const MAX_STORE_ENTRIES = 5000;
const rateStore = new Map();

const ROUTE_POLICIES = [
  {
    name: 'auth-strict',
    test: (p) =>
      p === '/api/auth/login' ||
      p === '/api/auth/register' ||
      p === '/api/auth/send-otp' ||
      p === '/api/admin/login',
    limit: 10, // Maks 10 percobaan per menit per IP
    throttleAfter: 5,
    baseDelayMs: 250,
  },
  {
    name: 'heavy-api',
    test: (p) => p.startsWith('/api/scan') || p.startsWith('/api/sheets'),
    limit: 25,
    throttleAfter: 15,
    baseDelayMs: 180,
  },
  {
    name: 'api-default',
    test: (p) => p.startsWith('/api/'),
    limit: 80,
    throttleAfter: 55,
    baseDelayMs: 120,
  },
];

export function getClientIp(request) {
  const fwd = request.headers.get('x-forwarded-for') || '';
  if (fwd) {
    const first = fwd.split(',')[0].trim();
    if (first) return first;
  }
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown-ip'
  ).trim();
}

function getPolicy(pathname) {
  return ROUTE_POLICIES.find((p) => p.test(pathname)) || ROUTE_POLICIES[ROUTE_POLICIES.length - 1];
}

function pruneStore(now) {
  if (rateStore.size <= MAX_STORE_ENTRIES) return;
  for (const [k, entry] of rateStore.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      rateStore.delete(k);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function applyRateLimitAndThrottle(request) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) {
    return { allowed: true, headers: {} };
  }

  const now = Date.now();
  pruneStore(now);

  const ip = getClientIp(request);
  const policy = getPolicy(pathname);
  const key = `${policy.name}:${ip}`;

  let entry = rateStore.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = { count: 0, windowStart: now, violations: entry ? entry.violations : 0 };
  }

  entry.count += 1;
  rateStore.set(key, entry);

  const remaining = Math.max(0, policy.limit - entry.count);
  const resetSec = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
  const rateHeaders = {
    'X-RateLimit-Limit': String(policy.limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.max(1, resetSec)),
  };

  // Rate limit terlampaui -> penalty violation + throttling + 429
  if (entry.count > policy.limit) {
    entry.violations = Math.min(10, (entry.violations || 0) + 1);
    const penaltyDelay = Math.min(1500, policy.baseDelayMs * entry.violations);
    await sleep(penaltyDelay);

    return {
      allowed: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.',
        },
        {
          status: 429,
          headers: {
            ...rateHeaders,
            'Retry-After': String(Math.max(1, resetSec)),
          },
        }
      ),
    };
  }

  // Progressive Throttling: perlambat request secara bertahap jika mulai mendekati limit
  if (entry.count > policy.throttleAfter) {
    const excess = entry.count - policy.throttleAfter;
    const delayMs = Math.min(1200, excess * policy.baseDelayMs);
    await sleep(delayMs);
  }

  return { allowed: true, headers: rateHeaders };
}
