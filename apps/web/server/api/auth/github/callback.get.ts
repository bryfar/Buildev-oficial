import {
  createError,
  defineEventHandler,
  getQuery,
  getRequestURL,
  sendRedirect,
} from 'h3';
import { signJwtHS256, verifyJwtHS256 } from '../../../utils/auth-session-jwt';
import {
  getAuthSessionSecret,
  getGithubOAuthClientId,
  getGithubOAuthClientSecret,
  isGithubOAuthConfigured,
} from '../../../utils/github-oauth-config';

type OAuthState = { p?: string; r?: string };
type GhTokenJson = { access_token?: string; error?: string; error_description?: string };

/**
 * GET /api/auth/github/callback — GitHub redirects here after user consent.
 */
export default defineEventHandler(async (event) => {
  if (!isGithubOAuthConfigured()) {
    throw createError({ statusCode: 503, message: 'GitHub OAuth is not configured.' });
  }

  const q = getQuery(event) as { code?: string; state?: string; error?: string; error_description?: string };
  if (q.error) {
    throw createError({
      statusCode: 400,
      message: q.error_description ?? q.error ?? 'GitHub OAuth error',
    });
  }

  const code = typeof q.code === 'string' ? q.code : '';
  const stateRaw = typeof q.state === 'string' ? q.state : '';
  if (!code || !stateRaw) {
    throw createError({ statusCode: 400, message: 'Missing code or state from GitHub.' });
  }

  const secret = getAuthSessionSecret();
  const st = verifyJwtHS256<OAuthState>(stateRaw, secret);
  if (!st || st.p !== 'gh_oauth' || typeof st.r !== 'string' || !st.r.trim()) {
    throw createError({ statusCode: 400, message: 'Invalid or expired OAuth state.' });
  }
  const returnTo = st.r;

  const apiUrl = getRequestURL(event);
  const callbackUrl = new URL('/api/auth/github/callback', apiUrl.origin).href;

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: getGithubOAuthClientId(),
      client_secret: getGithubOAuthClientSecret(),
      code,
      redirect_uri: callbackUrl,
    }),
  });

  const tokenJson = (await tokenRes.json()) as GhTokenJson;
  if (!tokenJson.access_token) {
    throw createError({
      statusCode: 400,
      message: tokenJson.error_description ?? tokenJson.error ?? 'GitHub did not return an access token.',
    });
  }

  const access = tokenJson.access_token;
  const ghHeaders = {
    Authorization: `Bearer ${access}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers: ghHeaders }),
    fetch('https://api.github.com/user/emails', { headers: ghHeaders }),
  ]);

  if (!userRes.ok || !emailsRes.ok) {
    throw createError({
      statusCode: 502,
      message: 'GitHub user or email API failed.',
    });
  }

  const ghUser = (await userRes.json()) as { id?: number; login?: string; name?: string | null };
  const emailsRaw: unknown = await emailsRes.json();
  if (!Array.isArray(emailsRaw)) {
    throw createError({ statusCode: 502, message: 'Unexpected GitHub emails response.' });
  }

  const emails = emailsRaw as Array<{ email: string; primary?: boolean; verified?: boolean }>;
  const primary =
    emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified) ?? emails[0];
  if (!primary?.email) {
    throw createError({
      statusCode: 400,
      message: 'GitHub did not return a usable email (check scopes read:user user:email).',
    });
  }

  const githubId = typeof ghUser.id === 'number' ? ghUser.id : 0;
  const userId = githubId ? `gh:${githubId}` : `gh:${primary.email}`;
  const displayName = (ghUser.name ?? ghUser.login ?? primary.email.split('@')[0] ?? 'User').trim();

  const sessionToken = signJwtHS256(
    {
      sub: userId,
      email: primary.email.toLowerCase(),
      name: displayName,
    },
    secret,
    60 * 60 * 24 * 30,
  );

  const fragment = new URLSearchParams({
    op_token: sessionToken,
    op_uid: userId,
    op_email: primary.email,
    op_name: displayName,
  }).toString();

  const out = new URL(returnTo);
  out.hash = fragment;
  return sendRedirect(event, out.toString(), 302);
});
