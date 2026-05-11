/**
 * Vitest entry when invoked from the Buildev workspace root (`buildev/`).
 * Reuses `apps/web/vite.config.ts` so `@/*` → `apps/web/src/*` and `root` stay aligned.
 * Prefer `npm test` (runs from `apps/web`); this file fixes `vitest run` from repo root.
 */
export { default } from './apps/web/vite.config.ts';
