import { defineEventHandler, readBody } from 'h3';
import { updatePresence } from '../../utils/mcp-sync-state';

interface PresencePostBody {
  clientId?: string;
  name?: string;
  sceneX?: number;
  sceneY?: number;
}

/** POST /api/mcp/presence — Receive user presence and cursor updates from clients. */
export default defineEventHandler(async (event) => {
  const body = (await readBody<PresencePostBody>(event)) ?? {};
  const clientId = event.headers.get('x-buildev-client-id') || body.clientId;

  if (!clientId) {
    return { success: false, error: 'Missing clientId' };
  }

  updatePresence(clientId, {
    name: body.name,
    sceneX: body.sceneX,
    sceneY: body.sceneY,
  });

  return { success: true };
});
