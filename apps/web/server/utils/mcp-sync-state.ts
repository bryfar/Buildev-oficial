/**
 * In-memory sync state for MCP <-> Renderer real-time communication.
 * Shared across Nitro API endpoints: GET/POST /api/mcp/document, GET /api/mcp/events.
 */

import type { PenDocument } from '../../src/types/pen';

let currentDocument: PenDocument | null = null;
let documentVersion = 0;
let currentSelection: string[] = [];
let currentActivePageId: string | null = null;
let lastActiveClientId: string | null = null;

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  sceneX?: number;
  sceneY?: number;
  lastSeen: number;
}

const presenceMap = new Map<string, UserPresence>();

const USER_COLORS = [
  '#FF5C00', // Orange
  '#0D99FF', // Blue
  '#1BC47D', // Green
  '#9747FF', // Purple
  '#FF24BD', // Pink
  '#F2C94C', // Yellow
];

function getNextColor() {
  return USER_COLORS[presenceMap.size % USER_COLORS.length];
}

interface SSEWriter {
  push(data: string): void;
}

interface SSEClient {
  id: string;
  writer: SSEWriter;
}

const clients = new Map<string, SSEClient>();

export function getSyncDocument(): { doc: PenDocument | null; version: number } {
  return { doc: currentDocument, version: documentVersion };
}

export function setSyncDocument(doc: PenDocument, sourceClientId?: string): number {
  currentDocument = doc;
  documentVersion++;
  if (sourceClientId) lastActiveClientId = sourceClientId;
  broadcast({ type: 'document:update', version: documentVersion, document: doc }, sourceClientId);
  return documentVersion;
}

export function getSyncSelection(): { selectedIds: string[]; activePageId: string | null } {
  return { selectedIds: currentSelection, activePageId: currentActivePageId };
}

export function clearSyncState(): void {
  currentDocument = null;
  documentVersion = 0;
  currentSelection = [];
  currentActivePageId = null;
  lastActiveClientId = null;
}

export function setSyncSelection(
  selectedIds: string[],
  activePageId?: string | null,
  sourceClientId?: string,
): void {
  currentSelection = selectedIds;
  if (activePageId !== undefined) currentActivePageId = activePageId;
  if (sourceClientId) lastActiveClientId = sourceClientId;
}

export function registerSSEClient(id: string, writer: SSEWriter): void {
  clients.set(id, { id, writer });
}

export function unregisterSSEClient(id: string): void {
  clients.delete(id);
}

export function getConnectedClientCount(): number {
  return clients.size;
}

function broadcast(payload: Record<string, unknown>, excludeClientId?: string): void {
  const recipients: SSEClient[] = [];
  for (const [id, client] of clients) {
    if (id === excludeClientId) continue;
    recipients.push(client);
  }

  // Return early when there are no recipients to avoid pointless JSON serialization for large documents.
  if (recipients.length === 0) return;

  const data = JSON.stringify(payload);
  for (const client of recipients) {
    try {
      client.writer.push(data);
    } catch {
      clients.delete(client.id);
    }
  }
}

export function markClientActive(clientId: string): void {
  if (clients.has(clientId)) {
    lastActiveClientId = clientId;
  }
}

export function getLastActiveClientId(): string | null {
  return lastActiveClientId;
}

export function isClientConnected(clientId: string): boolean {
  return clients.has(clientId);
}

export function sendToClient(clientId: string, payload: Record<string, unknown>): boolean {
  const client = clients.get(clientId);
  if (!client) return false;
  try {
    client.writer.push(JSON.stringify(payload));
    return true;
  } catch {
    clients.delete(clientId);
    return false;
  }
}

export function updatePresence(clientId: string, updates: Partial<UserPresence>): void {
  const existing = presenceMap.get(clientId);
  if (!existing) {
    const newUser: UserPresence = {
      id: clientId,
      name: updates.name || `User ${clientId.slice(0, 4)}`,
      color: getNextColor(),
      lastSeen: Date.now(),
      ...updates,
    };
    presenceMap.set(clientId, newUser);
    broadcast({ type: 'presence:join', user: newUser }, clientId);
  } else {
    const updated = { ...existing, ...updates, lastSeen: Date.now() };
    presenceMap.set(clientId, updated);
    // For performance, we could debounce cursor updates, but for now we broadcast
    broadcast({ type: 'presence:update', user: updated }, clientId);
  }
}

export function removePresence(clientId: string): void {
  if (presenceMap.has(clientId)) {
    presenceMap.delete(clientId);
    broadcast({ type: 'presence:leave', clientId });
  }
}

export function getActivePresences(): UserPresence[] {
  // Clean up stale users (older than 30s)
  const now = Date.now();
  for (const [id, user] of presenceMap) {
    if (now - user.lastSeen > 30_000) {
      presenceMap.delete(id);
      broadcast({ type: 'presence:leave', clientId: id });
    }
  }
  return Array.from(presenceMap.values());
}
