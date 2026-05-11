import { describe, it, expect } from 'vitest';
import { normalizePenDocument } from '@/utils/normalize-pen-file';
import { createEmptyDocument } from '@/stores/document-tree-utils';
import type { PenIdeWorkspace } from '@/types/pen';

describe('ideWorkspace JSON round-trip', () => {
  it('survives JSON.parse/stringify and normalizePenDocument', () => {
    const doc = createEmptyDocument();
    const iw: PenIdeWorkspace = {
      version: 1,
      frames: {
        'root-frame': {
          frameId: 'root-frame',
          dirty: true,
          files: [
            {
              path: 'src/pages/page-1/frames/root-frame.tsx',
              content: '// @buildev-frame-meta {"frameId":"root-frame","width":100,"height":200}\n',
              language: 'typescript',
            },
          ],
        },
      },
    };
    doc.ideWorkspace = iw;
    const round = JSON.parse(JSON.stringify(doc)) as typeof doc;
    const norm = normalizePenDocument(round);
    expect(norm.ideWorkspace).toEqual(iw);
  });
});
