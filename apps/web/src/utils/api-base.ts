/**
 * API Base URL for backend communication.
 * In development, we use the local backend (usually port 4000).
 * In production, it should be the public API URL.
 *
 * `apiBase` is the value from the build only (VITE_API_URL).
 * `getEffectiveApiBase()` also includes an optional browser-saved override
 * when the env var is unset, so sign-in and cloud calls can work without rebuild.
 */

import { appStorage } from '@/utils/app-storage';

const VITE_API_URL = import.meta.env.VITE_API_URL;

export const apiBaseFromEnv = typeof VITE_API_URL === 'string' ? VITE_API_URL.trim() : '';

/** Raw env URL only (no browser override). Kept for conditions that mean "configured at build". */
export const apiBase = apiBaseFromEnv;

const API_BASE_OVERRIDE_KEY = 'buildev-api-base-override';
const API_BASE_OVERRIDE_LEGACY_KEY = 'openpencil-api-base-override';

function readApiBaseOverride(): string {
  try {
    const next = (appStorage.getItem(API_BASE_OVERRIDE_KEY) ?? '').trim();
    if (next) return next;
    const legacy = (appStorage.getItem(API_BASE_OVERRIDE_LEGACY_KEY) ?? '').trim();
    if (legacy) {
      appStorage.setItem(API_BASE_OVERRIDE_KEY, legacy);
      appStorage.removeItem(API_BASE_OVERRIDE_LEGACY_KEY);
      return legacy;
    }
    return '';
  } catch {
    return '';
  }
}

export function getApiBaseOverride(): string {
  return readApiBaseOverride().replace(/\/$/, '');
}

/** Normalize user input to an origin (adds http:// if missing). Returns null if invalid. */
export function normalizeUserApiBaseInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let candidate = t;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `http://${candidate}`;
  }
  candidate = candidate.replace(/\/$/, '');
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function setApiBaseOverride(value: string | null | undefined): void {
  const t = (value ?? '').trim();
  if (!t) {
    appStorage.removeItem(API_BASE_OVERRIDE_KEY);
    return;
  }
  const normalized = normalizeUserApiBaseInput(t);
  if (!normalized) return;
  appStorage.setItem(API_BASE_OVERRIDE_KEY, normalized);
}

export function getEffectiveApiBase(): string {
  if (apiBaseFromEnv) {
    return apiBaseFromEnv.replace(/\/$/, '');
  }
  const fromOverride = readApiBaseOverride().replace(/\/$/, '');
  if (fromOverride) return fromOverride;
  // Browser: same origin as the app (TanStack + Nitro on one host) so OAuth works without VITE_API_URL.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

/**
 * Returns common headers including auth token if available.
 */
export function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
