import { createHmac, timingSafeEqual } from 'node:crypto';

function b64urlFromJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlToBuffer(segment: string): Buffer {
  const pad = '='.repeat((4 - (segment.length % 4)) % 4);
  return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sigB64UrlToBuffer(segment: string): Buffer {
  const pad = '='.repeat((4 - (segment.length % 4)) % 4);
  return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function signData(data: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signJwtHS256(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSec: number,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const head = b64urlFromJson(header);
  const pay = b64urlFromJson(body);
  const data = `${head}.${pay}`;
  const sig = signData(data, secret);
  return `${data}.${sig}`;
}

export function verifyJwtHS256<T extends Record<string, unknown>>(token: string, secret: string): T | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, pay, sig] = parts;
  if (!head || !pay || !sig) return null;
  const data = `${head}.${pay}`;
  const expected = signData(data, secret);
  try {
    const a = sigB64UrlToBuffer(sig);
    const b = sigB64UrlToBuffer(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(b64urlToBuffer(pay).toString('utf8'));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  const exp = o.exp;
  if (typeof exp !== 'number' || exp < Math.floor(Date.now() / 1000)) return null;
  return o as T;
}
