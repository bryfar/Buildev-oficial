function trimEnv(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function getGithubOAuthClientId(): string {
  return trimEnv('GITHUB_CLIENT_ID');
}

export function getGithubOAuthClientSecret(): string {
  return trimEnv('GITHUB_CLIENT_SECRET');
}

export function isGithubOAuthConfigured(): boolean {
  return Boolean(getGithubOAuthClientId() && getGithubOAuthClientSecret());
}

export function getAuthSessionSecret(): string {
  const s = trimEnv('AUTH_SESSION_SECRET');
  if (s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SESSION_SECRET must be set to a strong value in production.');
  }
  return 'buildev_dev_auth_session_change_me';
}

/** Allowed browser origins for the `redirect` query (SPA URL after login). */
export function parseAuthRedirectAllowlist(): string[] {
  return (process.env.AUTH_REDIRECT_ORIGINS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function isAllowedOAuthRedirect(target: string, apiOrigin: string): boolean {
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.origin === apiOrigin) return true;
  if (parseAuthRedirectAllowlist().includes(u.origin)) return true;
  const api = new URL(apiOrigin);
  const th = u.hostname;
  const ah = api.hostname;
  if (
    (th === 'localhost' || th === '127.0.0.1') &&
    (ah === 'localhost' || ah === '127.0.0.1')
  ) {
    return true;
  }
  return false;
}
