import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@/stores/document-tree-utils';
import type { PenDocument, ProjectMetadata } from '@/types/pen';
import {
  applyAssistedStackMigration,
  buildStackMigrationPreview,
} from '@/services/ide/stack-migration-assistant';

function withStack(doc: PenDocument, stack: 'react' | 'vue' | 'astro'): PenDocument {
  const meta: ProjectMetadata = {
    creationMode: 'normal',
    type: 'landing',
    projectName: 't',
    policy: { stack, templatePreset: 'p', dashboardMode: 'page' },
    createdAt: new Date().toISOString(),
  };
  return { ...doc, projectMeta: meta };
}

describe('stack-migration-assistant', () => {
  it('builds preview rows per ide frame', () => {
    const doc = withStack(createEmptyDocument(), 'react');
    doc.ideWorkspace = {
      version: 1,
      frames: {
        'root-frame': {
          frameId: 'root-frame',
          dirty: true,
          files: [{ path: 'src/pages/page-1/frames/root-frame.tsx', content: 'x' }],
        },
      },
    };
    const preview = buildStackMigrationPreview(doc, 'page-1', 'vue');
    expect(preview.currentStack).toBe('react');
    expect(preview.nextStack).toBe('vue');
    expect(preview.rows[0]?.toPath.endsWith('.vue')).toBe(true);
  });

  it('applies stack migration and keeps ide workspace entries', () => {
    const doc = withStack(createEmptyDocument(), 'react');
    doc.ideWorkspace = {
      version: 1,
      frames: {
        'root-frame': {
          frameId: 'root-frame',
          dirty: true,
          files: [{ path: 'src/pages/page-1/frames/root-frame.tsx', content: '// local edits' }],
        },
      },
    };
    const migrated = applyAssistedStackMigration(doc, 'page-1', 'astro');
    expect(migrated.projectMeta?.policy.stack).toBe('astro');
    expect(migrated.ideWorkspace?.frames['root-frame']).toBeTruthy();
    expect(migrated.ideWorkspace?.frames['root-frame']?.dirty).toBe(true);
  });
});

