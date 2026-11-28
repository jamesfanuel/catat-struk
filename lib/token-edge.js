const DEV_FALLBACK_SECRET = 'catatstruk_dev_secret_change_in_prod';
const IS_PROD = process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'development';

function getEdgeAuthSecret() {
  const raw = String(process.env.AUTH_SECRET || '').trim();
  if (IS_PROD) {
    if (!raw || raw === DEV_FALLBACK_SECRET || raw === 'ganti_dengan_string_acak_panjang') {
      return '';
    }
    return raw;
  }
  // Mode development: AUTH_SECRET opsional
  return raw || DEV_FALLBACK_SECRET;
}

function base64UrlToUint8Array(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function verifyHmacTokenEdge(token) {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const secret = getEdgeAuthSecret();
  if (!secret) return null;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const macBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const expectedSig = uint8ArrayToBase64Url(new Uint8Array(macBuffer));
    if (sig !== expectedSig) return null;

    const jsonStr = new TextDecoder().decode(base64UrlToUint8Array(data));
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
