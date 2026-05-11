import { createError, defineEventHandler, getRequestHeader, setResponseHeaders } from 'h3';
import { verifyJwtHS256 } from '../../utils/auth-session-jwt';
import { getAuthSessionSecret } from '../../utils/github-oauth-config';

type SessionPayload = { sub?: string; email?: string; name?: string };

/**
 * GET /api/auth/me — Bearer session JWT from GitHub OAuth (Buildev local auth).
 */
export default defineEventHandler((event) => {
  setResponseHeaders(event, { 'Content-Type': 'application/json' });
  const auth = getRequestHeader(event, 'authorization') ?? '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();
  if (!token) {
    throw createError({ statusCode: 401, message: 'Missing Authorization bearer token.' });
  }

  const secret = getAuthSessionSecret();
  const payload = verifyJwtHS256<SessionPayload>(token, secret);
  if (!payload?.sub || typeof payload.email !== 'string') {
    throw createError({ statusCode: 401, message: 'Invalid or expired session.' });
  }

  return {
    ok: true,
    data: {
      id: payload.sub,
      email: payload.email,
      ...(typeof payload.name === 'string' && payload.name ? { name: payload.name } : {}),
    },
  };
});
