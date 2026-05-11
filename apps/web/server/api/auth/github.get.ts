import { createError, defineEventHandler, getQuery, getRequestURL, sendRedirect } from 'h3';
import { signJwtHS256 } from '../../utils/auth-session-jwt';
import {
  getAuthSessionSecret,
  getGithubOAuthClientId,
  isGithubOAuthConfigured,
  isAllowedOAuthRedirect,
} from '../../utils/github-oauth-config';

/**
 * GET /api/auth/github?redirect=<encoded SPA URL>
 * Starts GitHub OAuth. Callback: GET /api/auth/github/callback (configure in GitHub OAuth App).
 */
export default defineEventHandler(async (event) => {
  if (!isGithubOAuthConfigured()) {
    throw createError({
      statusCode: 503,
      message:
        'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the server environment.',
    });
  }

  const q = getQuery(event) as { redirect?: string };
  const redirect = typeof q.redirect === 'string' ? q.redirect.trim() : '';
  if (!redirect) {
    throw createError({
      statusCode: 400,
      message: 'Missing redirect query parameter (return URL for the web app).',
    });
  }

  let redirectDecoded: string;
  try {
    redirectDecoded = decodeURIComponent(redirect);
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid redirect parameter encoding.' });
  }

  const apiUrl = getRequestURL(event);
  const apiOrigin = apiUrl.origin;
  if (!isAllowedOAuthRedirect(redirectDecoded, apiOrigin)) {
    throw createError({
      statusCode: 400,
      message:
        'Redirect origin is not allowed. Use the same host as the API, localhost dev, or add AUTH_REDIRECT_ORIGINS.',
    });
  }

  const secret = getAuthSessionSecret();
  const state = signJwtHS256({ p: 'gh_oauth', r: redirectDecoded }, secret, 15 * 60);
  const callbackUrl = new URL('/api/auth/github/callback', apiOrigin).href;

  const params = new URLSearchParams({
    client_id: getGithubOAuthClientId(),
    redirect_uri: callbackUrl,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  });

  return sendRedirect(event, `https://github.com/login/oauth/authorize?${params.toString()}`, 302);
});
