import { defineEventHandler } from 'h3';
import { clearSyncState, getConnectedClientCount } from '../../utils/mcp-sync-state';

/** POST /api/mcp/sync-reset — Clears stale sync cache on page load / file open. */
export default defineEventHandler(() => {
  if (getConnectedClientCount() > 0) {
    return { ok: true, skipped: true, reason: 'active-collaboration-session' };
  }

  clearSyncState();
  return { ok: true, skipped: false };
});
