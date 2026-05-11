import { describe, it, expect } from 'vitest';
import { suggestNewVirtualPath } from '../ide-suggest-new-virtual-path';

describe('ide-suggest-new-virtual-path', () => {
  it('defaults next path beside anchor in same folder', () => {
    expect(
      suggestNewVirtualPath('src/pages/page-1/frames/root-frame.tsx', [
        'src/pages/page-1/frames/root-frame.tsx',
      ]),
    ).toBe('src/pages/page-1/frames/Untitled-1.tsx');
  });

  it('increments when names collide', () => {
    expect(
      suggestNewVirtualPath('src/a.tsx', ['src/a.tsx', 'src/Untitled-1.tsx']),
    ).toBe('src/Untitled-2.tsx');
  });
});
