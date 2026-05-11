// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@/stores/document-store';
import { useHistoryStore } from '@/stores/history-store';

describe('document-store IDE workspace', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
    useDocumentStore.getState().newDocument();
  });

  it('newDocument includes empty ideWorkspace', () => {
    const doc = useDocumentStore.getState().document;
    expect(doc.ideWorkspace).toEqual({ version: 1, frames: {} });
  });

  it('upsertIdeFrameFile marks frame dirty and persists content', () => {
    useDocumentStore.getState().upsertIdeFrameFile('root-frame', 'src/pages/page-1/f.tsx', 'hello', {
      language: 'typescript',
    });
    const doc = useDocumentStore.getState().document;
    expect(doc.ideWorkspace?.frames['root-frame']?.dirty).toBe(true);
    expect(useDocumentStore.getState().getIdeFrameFile('root-frame', 'src/pages/page-1/f.tsx')).toBe(
      'hello',
    );
  });

  it('replaceIdeFrameFiles clears dirty', () => {
    useDocumentStore.getState().upsertIdeFrameFile('root-frame', 'p.tsx', 'a', {});
    useDocumentStore.getState().replaceIdeFrameFiles('root-frame', [{ path: 'p.tsx', content: 'b' }]);
    expect(useDocumentStore.getState().document.ideWorkspace?.frames['root-frame']?.dirty).toBe(
      false,
    );
    expect(useDocumentStore.getState().getIdeFrameFile('root-frame', 'p.tsx')).toBe('b');
  });
});
