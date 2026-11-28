import { NextResponse } from 'next/server.js';
import { applyRateLimitAndThrottle } from './rate-limit.js';
import { sanitizeIncomingHeaders, zeroTrustPreflight, verifyZeroTrustAuth } from './zero-trust.js';
import { applySecurityHeaders } from './security-headers.js';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Zero Trust Preflight (anti header-spoofing, traversal, scanner, CSRF, payload limit)
  const preflightErr = zeroTrustPreflight(request);
  if (preflightErr) {
    return applySecurityHeaders(preflightErr, pathname);
  }

  // 2. Rate Limit & Progressive Throttling (khusus /api/*)
  const rateResult = await applyRateLimitAndThrottle(request);
  if (!rateResult.allowed) {
    return applySecurityHeaders(rateResult.response, pathname);
  }

  // 3. Zero Trust Cryptographic Token Verification & Least-Privilege Role Check
  const cleanHeaders = sanitizeIncomingHeaders(request);
  const authResult = await verifyZeroTrustAuth(request, cleanHeaders);
  if (!authResult.ok) {
    return applySecurityHeaders(authResult.response, pathname);
  }

  const response = NextResponse.next({
    request: { headers: authResult.headers },
  });

  // 4. Attach Rate Limit & Security Headers
  if (rateResult.headers) {
    Object.entries(rateResult.headers).forEach(([k, v]) => {
      response.headers.set(k, v);
    });
  }

  return applySecurityHeaders(response, pathname);
}
