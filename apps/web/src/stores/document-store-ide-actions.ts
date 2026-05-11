import type { PenDocument, PenIdeFrameWorkspace, PenIdeVirtualFile, PenIdeWorkspace } from '@/types/pen';

type DocState = { document: PenDocument; isDirty: boolean };

type SetDoc = {
  (partial: Partial<DocState>): void;
  (fn: (state: DocState) => Partial<DocState>): void;
};

function emptyFrameWorkspace(frameId: string): PenIdeFrameWorkspace {
  return { frameId, files: [], dirty: false };
}

function baseIdeWorkspace(doc: PenDocument): PenIdeWorkspace {
  return doc.ideWorkspace ?? { version: 1, frames: {} };
}

export function createIdeActions(set: SetDoc, get: () => DocState) {
  return {
    upsertIdeFrameFile: (
      frameId: string,
      path: string,
      content: string,
      options?: { language?: string; markDirty?: boolean },
    ) => {
      const markDirty = options?.markDirty !== false;
      set((state) => {
        const root = baseIdeWorkspace(state.document);
        const prev = root.frames[frameId] ?? emptyFrameWorkspace(frameId);
        const files = [...prev.files];
        const idx = files.findIndex((f) => f.path === path);
        const nextFile: PenIdeVirtualFile = {
          path,
          content,
          ...(options?.language ? { language: options.language } : {}),
        };
        if (idx >= 0) files[idx] = nextFile;
        else files.push(nextFile);
        const nextFrame: PenIdeFrameWorkspace = {
          ...prev,
          frameId,
          files,
          ...(markDirty ? { dirty: true } : { dirty: false }),
        };
        const nextIw: PenIdeWorkspace = {
          version: 1,
          frames: { ...root.frames, [frameId]: nextFrame },
        };
        return {
          document: {
            ...state.document,
            ideWorkspace: nextIw,
          },
          isDirty: true,
        };
      });
    },

    replaceIdeFrameFiles: (frameId: string, files: PenIdeVirtualFile[]) => {
      set((state) => {
        const root = baseIdeWorkspace(state.document);
        const prev = root.frames[frameId] ?? emptyFrameWorkspace(frameId);
        const nextIw: PenIdeWorkspace = {
          version: 1,
          frames: {
            ...root.frames,
            [frameId]: { ...prev, frameId, files, dirty: false },
          },
        };
        return {
          document: {
            ...state.document,
            ideWorkspace: nextIw,
          },
          isDirty: true,
        };
      });
    },

    setIdeFrameDirty: (frameId: string, dirty: boolean) => {
      set((state) => {
        const root = baseIdeWorkspace(state.document);
        const prev = root.frames[frameId];
        if (!prev) {
          if (!dirty) return {};
          const nextIw: PenIdeWorkspace = {
            version: 1,
            frames: {
              ...root.frames,
              [frameId]: { ...emptyFrameWorkspace(frameId), dirty: true },
            },
          };
          return {
            document: { ...state.document, ideWorkspace: nextIw },
            isDirty: true,
          };
        }
        const nextIw: PenIdeWorkspace = {
          version: 1,
          frames: { ...root.frames, [frameId]: { ...prev, dirty } },
        };
        return {
          document: { ...state.document, ideWorkspace: nextIw },
          isDirty: true,
        };
      });
    },

    clearIdeWorkspaceForFrame: (frameId: string) => {
      set((state) => {
        const root = state.document.ideWorkspace;
        if (!root?.frames[frameId]) return {};
        const rest = { ...root.frames };
        delete rest[frameId];
        const nextIw: PenIdeWorkspace = { version: 1, frames: rest };
        return {
          document: {
            ...state.document,
            ideWorkspace: nextIw,
          },
          isDirty: true,
        };
      });
    },

    getIdeFrameFile: (frameId: string, path: string): string | undefined => {
      const f = get().document.ideWorkspace?.frames[frameId]?.files.find((x) => x.path === path);
      return f?.content;
    },
  };
}
