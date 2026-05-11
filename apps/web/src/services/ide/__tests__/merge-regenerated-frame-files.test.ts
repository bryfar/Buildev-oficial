import { describe, it, expect, vi, afterEach } from 'vitest';
import { mergeRegeneratedPrimaryFrameFile } from '../merge-regenerated-frame-files';

describe('mergeRegeneratedPrimaryFrameFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces primary path and preserves other files', () => {
    const merged = mergeRegeneratedPrimaryFrameFile(
      [
        { path: 'src/pages/p1/f.tsx', content: 'old', language: 'typescript' },
        { path: 'notes.txt', content: 'keep me' },
      ],
      { path: 'src/pages/p1/f.tsx', content: 'new', language: 'typescript' },
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((f) => f.path === 'src/pages/p1/f.tsx')?.content).toBe('new');
    expect(merged.find((f) => f.path === 'notes.txt')?.content).toBe('keep me');
  });

  it('adds generated file when list was empty', () => {
    const merged = mergeRegeneratedPrimaryFrameFile([], {
      path: 'src/a.tsx',
      content: 'x',
      language: 'typescript',
    });
    expect(merged).toEqual([{ path: 'src/a.tsx', content: 'x', language: 'typescript' }]);
  });

  it('sorts by path', () => {
    const merged = mergeRegeneratedPrimaryFrameFile(
      [{ path: 'z.ts', content: '1' }],
      { path: 'a.ts', content: '2', language: 'typescript' },
    );
    expect(merged.map((f) => f.path)).toEqual(['a.ts', 'z.ts']);
  });

  it('warns when duplicate paths appear in existing files', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mergeRegeneratedPrimaryFrameFile(
      [
        { path: 'dup.tsx', content: 'a' },
        { path: 'dup.tsx', content: 'b' },
      ],
      { path: 'dup.tsx', content: 'new', language: 'typescript' },
    );
    expect(warn).toHaveBeenCalled();
  });

  it('can keep local content when conflict strategy is keep_local', () => {
    const merged = mergeRegeneratedPrimaryFrameFile(
      [{ path: 'src/frame.tsx', content: 'local edits' }],
      { path: 'src/frame.tsx', content: 'generated', language: 'typescript' },
      { conflictStrategy: 'keep_local' },
    );
    expect(merged.find((f) => f.path === 'src/frame.tsx')?.content).toBe('local edits');
  });

  it('can mark conflicts when strategy is mark_conflict', () => {
    const merged = mergeRegeneratedPrimaryFrameFile(
      [{ path: 'src/frame.tsx', content: 'local edits' }],
      { path: 'src/frame.tsx', content: 'generated', language: 'typescript' },
      { conflictStrategy: 'mark_conflict' },
    );
    const content = merged.find((f) => f.path === 'src/frame.tsx')?.content ?? '';
    expect(content).toContain('<<<<<<< LOCAL_EDITS');
    expect(content).toContain('>>>>>>> REGENERATED_FROM_DESIGN');
  });
});
