const STORAGE_KEY = 'buildev-pending-workspace-id';

export function setPendingWorkspaceId(workspaceId: string | null): void {
  try {
    if (workspaceId) sessionStorage.setItem(STORAGE_KEY, workspaceId);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function peekPendingWorkspaceId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingWorkspaceId(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
