import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { appStorage } from '@/utils/app-storage';
import { clearPendingWorkspaceId, peekPendingWorkspaceId } from '@/utils/pending-workspace-assignment';

const STORAGE_KEY = 'buildev-workspace-registry-v1';

export type BuildevWorkspace = {
  id: string;
  name: string;
  createdAt: number;
};

type RegistrySnapshot = {
  workspaces: BuildevWorkspace[];
  /** projectKey (e.g. `path:C:/a.op` or `name:foo.op`) -> workspaceId */
  assignmentByProject: Record<string, string>;
};

function emptyRegistry(): RegistrySnapshot {
  return { workspaces: [], assignmentByProject: {} };
}

function loadSnapshot(): RegistrySnapshot {
  try {
    const raw = appStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyRegistry();
    const parsed = JSON.parse(raw) as Partial<RegistrySnapshot>;
    if (!parsed || typeof parsed !== 'object') return emptyRegistry();
    return {
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      assignmentByProject:
        parsed.assignmentByProject && typeof parsed.assignmentByProject === 'object'
          ? parsed.assignmentByProject
          : {},
    };
  } catch {
    return emptyRegistry();
  }
}

function persist(snapshot: RegistrySnapshot): void {
  try {
    appStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

function newWorkspaceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type WorkspaceRegistryState = RegistrySnapshot & {
  hydrate: () => void;
  createWorkspace: (name: string) => BuildevWorkspace;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  assignProjectToWorkspace: (projectKey: string, workspaceId: string) => void;
  releaseProject: (projectKey: string) => void;
  getWorkspaceIdForProject: (projectKey: string) => string | undefined;
  listProjectKeysInWorkspace: (workspaceId: string) => string[];
};

export const useWorkspaceRegistryStore = create<WorkspaceRegistryState>()(
  subscribeWithSelector((set, get) => ({
    ...emptyRegistry(),

    hydrate: () => {
      const snap = loadSnapshot();
      set((s) => ({ ...s, workspaces: snap.workspaces, assignmentByProject: snap.assignmentByProject }));
    },

    createWorkspace: (name) => {
      const ws: BuildevWorkspace = {
        id: newWorkspaceId(),
        name: name.trim() || 'Workspace',
        createdAt: Date.now(),
      };
      const next: RegistrySnapshot = {
        workspaces: [...get().workspaces, ws],
        assignmentByProject: { ...get().assignmentByProject },
      };
      set((s) => ({ ...s, ...next }));
      persist(next);
      return ws;
    },

    renameWorkspace: (id, name) => {
      const label = name.trim();
      if (!label) return;
      const workspaces = get().workspaces.map((w) => (w.id === id ? { ...w, name: label } : w));
      const next: RegistrySnapshot = { workspaces, assignmentByProject: { ...get().assignmentByProject } };
      set((s) => ({ ...s, ...next }));
      persist(next);
    },

    deleteWorkspace: (id) => {
      const assignmentByProject = { ...get().assignmentByProject };
      for (const [k, wid] of Object.entries(assignmentByProject)) {
        if (wid === id) delete assignmentByProject[k];
      }
      const workspaces = get().workspaces.filter((w) => w.id !== id);
      const next: RegistrySnapshot = { workspaces, assignmentByProject };
      set((s) => ({ ...s, ...next }));
      persist(next);
    },

    assignProjectToWorkspace: (projectKey, workspaceId) => {
      const exists = get().workspaces.some((w) => w.id === workspaceId);
      if (!exists) return;
      const assignmentByProject = { ...get().assignmentByProject, [projectKey]: workspaceId };
      const next: RegistrySnapshot = { workspaces: get().workspaces, assignmentByProject };
      set((s) => ({ ...s, ...next }));
      persist(next);
    },

    releaseProject: (projectKey) => {
      const assignmentByProject = { ...get().assignmentByProject };
      delete assignmentByProject[projectKey];
      const next: RegistrySnapshot = { workspaces: get().workspaces, assignmentByProject };
      set((s) => ({ ...s, ...next }));
      persist(next);
    },

    getWorkspaceIdForProject: (projectKey) => get().assignmentByProject[projectKey],

    listProjectKeysInWorkspace: (workspaceId) => {
      const out: string[] = [];
      for (const [k, wid] of Object.entries(get().assignmentByProject)) {
        if (wid === workspaceId) out.push(k);
      }
      return out;
    },
  })),
);

/** Called after a successful disk save so new files land in the pending workspace (if any). */
export function assignSavedFileToPendingWorkspace(filePath: string | null, _fileName: string): void {
  if (!filePath) return;
  const pending = peekPendingWorkspaceId();
  if (!pending) return;
  const norm = filePath.replace(/\\/g, '/');
  const projectKey = `path:${norm}`;
  useWorkspaceRegistryStore.getState().assignProjectToWorkspace(projectKey, pending);
  clearPendingWorkspaceId();
}
