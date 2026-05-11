import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * After GitHub OAuth, the server redirects to the SPA with session params in the URL hash.
 * This component reads them once, stores the session, and clears the hash from the URL.
 */
export function OAuthHashSessionHandler() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw || !raw.includes('op_token=')) return;

    const sp = new URLSearchParams(raw);
    const token = sp.get('op_token');
    const uid = sp.get('op_uid');
    const email = sp.get('op_email') ?? '';
    const name = sp.get('op_name') ?? undefined;
    if (!token?.trim() || !uid?.trim()) return;

    done.current = true;
    useAuthStore.getState().login(token, uid, {
      id: uid,
      email,
      ...(name ? { name } : {}),
    });

    const path = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', path);

    void useAuthStore.getState().checkAuth();
  }, []);

  return null;
}
