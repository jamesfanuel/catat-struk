import { NextResponse } from 'next/server';
import { verifyHmacTokenEdge } from './lib/token-edge.js';

const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/send-otp',
  '/api/admin/login',
]);

function extractBearerToken(request) {
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

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = extractBearerToken(request);
  const payload = await verifyHmacTokenEdge(token);

  if (!payload) {
    return NextResponse.json(
      { ok: false, error: 'Token tidak valid atau sesi telah berakhir.' },
      { status: 401 }
    );
  }

  const requestHeaders = new Headers(request.headers);

  if (pathname.startsWith('/api/admin')) {
    if (payload.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Akses ditolak. Membutuhkan token admin.' },
        { status: 403 }
      );
    }
    requestHeaders.set('x-auth-role', 'admin');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!payload.username) {
    return NextResponse.json(
      { ok: false, error: 'Token user tidak valid.' },
      { status: 401 }
    );
  }

  requestHeaders.set('x-auth-user', payload.username);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*'],
};
