import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { PenNode } from '@/types/pen';
import type { Framework } from '@/types/codegen';
import { nanoid } from 'nanoid';

export type CodeFramework = Framework;

export interface CodeFile {
  id: string;
  name: string;
  path: string;
  framework: CodeFramework;
  content: string;
  lastSynced?: number;
  isDirty: boolean;
}

export interface CodeSyncState {
  isCodeMode: boolean;
  files: CodeFile[];
  activeFileId: string | null;
  syncEnabled: boolean;
  lastSyncError: string | null;
  isSyncing: boolean;
  
  setCodeMode: (enabled: boolean) => void;
  addFile: (file: Omit<CodeFile, 'id' | 'isDirty'>) => string;
  removeFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string | null) => void;
  setSyncEnabled: (enabled: boolean) => void;
  syncFileToCanvas: (fileId: string) => Promise<PenNode[]>;
  markSynced: (id: string) => void;
  setSyncError: (error: string | null) => void;
  clearFiles: () => void;
}

export const useCodeSyncStore = create<CodeSyncState>()(
  subscribeWithSelector((set, get) => ({
    isCodeMode: false,
    files: [],
    activeFileId: null,
    syncEnabled: true,
    lastSyncError: null,
    isSyncing: false,

    setCodeMode: (enabled) => set({ isCodeMode: enabled }),

    addFile: (file) => {
      const id = nanoid();
      set((state) => ({
        files: [...state.files, { ...file, id, isDirty: false }],
        activeFileId: state.activeFileId ?? id,
      }));
      return id;
    },

    removeFile: (id) => set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      activeFileId: state.activeFileId === id 
        ? state.files.find((f) => f.id !== id)?.id ?? null 
        : state.activeFileId,
    })),

    updateFileContent: (id, content) => set((state) => ({
      files: state.files.map((f) => 
        f.id === id 
          ? { ...f, content, isDirty: true }
          : f
      ),
    })),

    setActiveFile: (id) => set({ activeFileId: id }),

    setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),

    syncFileToCanvas: async (fileId) => {
      const file = get().files.find((f) => f.id === fileId);
      if (!file) return [];

      set({ isSyncing: true, lastSyncError: null });

      try {
        const parser = getCodeParser(file.framework);
        const nodes = await parser(file.content);
        set({ isSyncing: false });
        return nodes;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        set({ isSyncing: false, lastSyncError: errorMsg });
        console.error('[CodeSync] Parse error:', errorMsg);
        return [];
      }
    },

    markSynced: (id) => set((state) => ({
      files: state.files.map((f) => 
        f.id === id 
          ? { ...f, isDirty: false, lastSynced: Date.now() }
          : f
      ),
    })),

    setSyncError: (error) => set({ lastSyncError: error, isSyncing: false }),

    clearFiles: () => set({ files: [], activeFileId: null }),
  }))
);

type CodeParser = (code: string) => Promise<PenNode[]>;

function getCodeParser(framework: CodeFramework): CodeParser {
  switch (framework) {
    case 'react':
      return parseReactCode;
    case 'vue':
      return parseVueCode;
    case 'html':
      return parseHtmlCode;
    default:
      return parseGenericCode;
  }
}

async function parseReactCode(code: string): Promise<PenNode[]> {
  const { parseReactToNodes } = await import('@/services/code-parsers/react-parser');
  return parseReactToNodes(code);
}

async function parseVueCode(code: string): Promise<PenNode[]> {
  const { parseVueToNodes } = await import('@/services/code-parsers/vue-parser');
  return parseVueToNodes(code);
}

async function parseHtmlCode(code: string): Promise<PenNode[]> {
  const { parseHtmlToNodes } = await import('@/services/code-parsers/html-parser');
  return parseHtmlToNodes(code);
}

async function parseGenericCode(code: string): Promise<PenNode[]> {
  const { parseGenericToNodes } = await import('@/services/code-parsers/generic-parser');
  return parseGenericToNodes(code);
}