import type { PenDocument } from '@/types/pen';

/** sessionStorage / localStorage key prefix for one-shot HTML preview payloads (`${prefix}${sessionId}`). */
export const PREVIEW_PAYLOAD_STORAGE_PREFIX = 'buildev:preview:v1:';

const PREVIEW_PAYLOAD_LEGACY_PREFIX = 'openpencil:preview:v1:';

/**
 * Discard stale payloads when falling back to localStorage (survives new windows; must not linger forever).
 */
export const PREVIEW_PAYLOAD_TTL_MS = 15 * 60_000;

export type StoredPreviewPayloadV1 = {
  v: 1;
  pageId: string;
  document: PenDocument | null;
  /** ms since epoch; older payloads are ignored (optional for backwards compatibility). */
  storedAt?: number;
};

export type ReadPreviewPayloadError =
  | 'missing-session'
  | 'expired-session'
  | 'invalid-payload'
  | 'mismatch';

export function normalizePreviewRoutePageParam(routePageId: string): string {
  try {
    return decodeURIComponent(routePageId);
  } catch {
    return routePageId;
  }
}

/**
 * Persists to sessionStorage and localStorage. New windows do not always share the opener's
 * sessionStorage (Electron and some browsers), so localStorage is required for reliable preview.
 */
/** @returns true if at least one storage backend accepted the write */
export function persistPreviewPayloadForNewTab(sessionId: string, payload: StoredPreviewPayloadV1): boolean {
  const key = PREVIEW_PAYLOAD_STORAGE_PREFIX + sessionId;
  const serialized = JSON.stringify(payload);
  let ok = false;
  try {
    sessionStorage.setItem(key, serialized);
    ok = true;
  } catch {
    /* quota / unavailable */
  }
  try {
    localStorage.setItem(key, serialized);
    ok = true;
  } catch {
    /* quota / private mode */
  }
  return ok;
}

/** Read merged session + local; does not mutate storage (avoids React Strict Mode double-mount races). */
export function readStoredPreviewPayloadJson(sessionKey: string): string | null {
  const key = PREVIEW_PAYLOAD_STORAGE_PREFIX + sessionKey;
  const legacyKey = PREVIEW_PAYLOAD_LEGACY_PREFIX + sessionKey;
  try {
    return (
      sessionStorage.getItem(key) ??
      localStorage.getItem(key) ??
      sessionStorage.getItem(legacyKey) ??
      localStorage.getItem(legacyKey)
    );
  } catch {
    return null;
  }
}

export function readPreviewPayload(
  routePageId: string,
  sessionKey: string | undefined,
  now: number = Date.now(),
): { ok: true; payload: StoredPreviewPayloadV1 } | { ok: false; error: ReadPreviewPayloadError } {
  if (!sessionKey) {
    return { ok: false, error: 'missing-session' };
  }
  const raw = readStoredPreviewPayloadJson(sessionKey);
  if (!raw) {
    return { ok: false, error: 'expired-session' };
  }

  let payload: StoredPreviewPayloadV1;
  try {
    payload = JSON.parse(raw) as StoredPreviewPayloadV1;
  } catch {
    return { ok: false, error: 'invalid-payload' };
  }

  if (payload.v !== 1 || typeof payload.pageId !== 'string') {
    return { ok: false, error: 'invalid-payload' };
  }

  const storedAt = typeof payload.storedAt === 'number' ? payload.storedAt : 0;
  if (storedAt > 0 && now - storedAt > PREVIEW_PAYLOAD_TTL_MS) {
    return { ok: false, error: 'expired-session' };
  }

  const routeNorm = normalizePreviewRoutePageParam(routePageId);
  const pageMatches = payload.pageId === routePageId || payload.pageId === routeNorm;
  if (!pageMatches) {
    return { ok: false, error: 'mismatch' };
  }

  return { ok: true, payload };
}
