import { NextResponse } from 'next/server.js';
import { verifyHmacTokenEdge } from '../lib/token-edge.js';

/**
 * Zero Trust Policy:
 * 1. Never trust implicit headers from clients (strip spoofable internal headers).
 * 2. Strict CSRF / Origin verification on mutating API calls.
 * 3. Payload size & Content-Type enforcement + scanner/traversal blocking.
 * 4. Cryptographic HMAC-SHA256 verification on every protected route + least-privilege role check.
 */

export const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/send-otp',
  '/api/admin/login',
  '/api/version',
]);

const SPOOFABLE_HEADERS = [
  'x-auth-user',
  'x-auth-role',
  'x-zero-trust-verified',
];

const BLOCKED_SCANNER_RE = /(sqlmap|nikto|nessus|gobuster|dirbuster|masscan|acunetix|nmap)/i;
const PATH_TRAVERSAL_RE = /(\.\.[/\\]|%2e%2e|%00|\0)/i;

const MAX_SCAN_BYTES = 6 * 1024 * 1024; // 6 MB untuk upload gambar base64
const MAX_DEFAULT_BYTES = 512 * 1024; // 512 KB untuk API JSON biasa

export function extractBearerToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return (
    request.headers.get('x-auth-token') ||
    request.headers.get('x-admin-token') ||
    ''
  ).trim();
}

export function sanitizeIncomingHeaders(request) {
  const cleanHeaders = new Headers(request.headers);
  for (const h of SPOOFABLE_HEADERS) {
    cleanHeaders.delete(h);
  }
  return cleanHeaders;
}

export function zeroTrustPreflight(request) {
  const { pathname, search } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Blokir pola path traversal / null byte
  if (PATH_TRAVERSAL_RE.test(pathname) || PATH_TRAVERSAL_RE.test(search || '')) {
    return NextResponse.json(
      { ok: false, error: 'Permintaan ditolak oleh kebijakan keamanan.' },
      { status: 400 }
    );
  }

  // Blokir automated vulnerability scanner yang teridentifikasi
  const ua = request.headers.get('user-agent') || '';
  if (BLOCKED_SCANNER_RE.test(ua)) {
    return NextResponse.json(
      { ok: false, error: 'Akses ditolak.' },
      { status: 403 }
    );
  }

  if (!pathname.startsWith('/api/')) {
    return null;
  }

  // Cek Origin/Referer untuk method mutasi (Anti-CSRF)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const host = (request.headers.get('host') || '').toLowerCase();
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    const sourceUrl = origin || referer;
    if (sourceUrl) {
      try {
        const sourceHost = new URL(sourceUrl).host.toLowerCase();
        if (host && sourceHost !== host) {
          return NextResponse.json(
            { ok: false, error: 'Origin tidak diizinkan (CSRF protection).' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: 'Origin/Referer header tidak valid.' },
          { status: 403 }
        );
      }
    }

    // Validasi Content-Type & Content-Length untuk mutasi API
    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    if (
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('multipart/form-data')
    ) {
      return NextResponse.json(
        { ok: false, error: 'Content-Type tidak didukung.' },
        { status: 415 }
      );
    }

    const contentLen = Number(request.headers.get('content-length') || 0);
    const maxAllowed = pathname.startsWith('/api/scan') ? MAX_SCAN_BYTES : MAX_DEFAULT_BYTES;
    if (Number.isFinite(contentLen) && contentLen > maxAllowed) {
      return NextResponse.json(
        { ok: false, error: 'Ukuran payload melebihi batas aman.' },
        { status: 413 }
      );
    }
  }

  return null;
}

export async function verifyZeroTrustAuth(request, cleanHeaders) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return { ok: true, headers: cleanHeaders };
  }

  if (PUBLIC_API_PATHS.has(pathname)) {
    cleanHeaders.set('x-zero-trust-verified', 'public-route');
    return { ok: true, headers: cleanHeaders };
  }

  const token = extractBearerToken(request);
  const payload = await verifyHmacTokenEdge(token);

  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Token tidak valid atau sesi telah berakhir.' },
        { status: 401 }
      ),
    };
  }

  // Least-privilege check: route admin hanya untuk token role admin
  if (pathname.startsWith('/api/admin')) {
    if (payload.role !== 'admin') {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: 'Akses ditolak. Membutuhkan token admin.' },
          { status: 403 }
        ),
      };
    }
    cleanHeaders.set('x-auth-role', 'admin');
    cleanHeaders.set('x-zero-trust-verified', 'admin');
    return { ok: true, headers: cleanHeaders };
  }

  if (!payload.username) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Token user tidak valid.' },
        { status: 401 }
      ),
    };
  }

  cleanHeaders.set('x-auth-user', String(payload.username));
  cleanHeaders.set('x-zero-trust-verified', 'user');
  return { ok: true, headers: cleanHeaders };
}
