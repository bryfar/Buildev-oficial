import { describe, expect, it } from 'vitest';
import { signJwtHS256, verifyJwtHS256 } from '../auth-session-jwt';

describe('auth-session-jwt', () => {
  it('round-trips OAuth state payload', () => {
    const secret = 'test-secret-at-least-16';
    const token = signJwtHS256({ p: 'gh_oauth', r: 'http://localhost:5173/' }, secret, 60);
    const out = verifyJwtHS256<{ p?: string; r?: string }>(token, secret);
    expect(out?.p).toBe('gh_oauth');
    expect(out?.r).toBe('http://localhost:5173/');
  });

  it('rejects tampered signature', () => {
    const secret = 'test-secret-at-least-16';
    const token = signJwtHS256({ sub: 'u1' }, secret, 60);
    const parts = token.split('.');
    parts[2] = 'aaaa';
    expect(verifyJwtHS256(parts.join('.'), secret)).toBeNull();
  });
});
