import type { PenDocument, ProjectStack } from '@/types/pen';
import { buildDeterministicFrameSource, getEffectiveProjectStack } from '@/services/ide/frame-to-code';
import { mergeRegeneratedPrimaryFrameFile } from '@/services/ide/merge-regenerated-frame-files';

export type StackMigrationDiffRow = {
  frameId: string;
  fromPath: string;
  toPath: string;
  action: 'unchanged' | 'renamed' | 'new';
};

export type StackMigrationPreview = {
  currentStack: ProjectStack;
  nextStack: ProjectStack;
  rows: StackMigrationDiffRow[];
  assistantNote: string;
};

function withStack(doc: PenDocument, stack: ProjectStack): PenDocument {
  if (!doc.projectMeta) return doc;
  return {
    ...doc,
    projectMeta: {
      ...doc.projectMeta,
      policy: {
        ...doc.projectMeta.policy,
        stack,
      },
    },
  };
}

export function buildStackMigrationPreview(
  doc: PenDocument,
  pageId: string,
  nextStack: ProjectStack,
): StackMigrationPreview {
  const currentStack = getEffectiveProjectStack(doc);
  const currentFrames = doc.ideWorkspace?.frames ?? {};
  const nextDoc = withStack(doc, nextStack);
  const rows: StackMigrationDiffRow[] = [];
  for (const frameId of Object.keys(currentFrames)) {
    const files = currentFrames[frameId]?.files ?? [];
    const currentPrimary = files.find((f) => /\/frames\/[^/]+\.(tsx|vue|astro)$/i.test(f.path));
    try {
      const generated = buildDeterministicFrameSource(nextDoc, pageId, frameId);
      const fromPath = currentPrimary?.path ?? generated.path;
      const action: StackMigrationDiffRow['action'] =
        !currentPrimary ? 'new' : currentPrimary.path === generated.path ? 'unchanged' : 'renamed';
      rows.push({ frameId, fromPath, toPath: generated.path, action });
    } catch {
      // Frame may have been deleted from tree; skip preview row.
    }
  }
  const changed = rows.filter((r) => r.action !== 'unchanged').length;
  const assistantNote =
    changed === 0
      ? 'No path changes detected. Primary files will be regenerated for the selected stack.'
      : `Migration will update ${changed} primary virtual file path(s) for the selected stack.`;
  return { currentStack, nextStack, rows, assistantNote };
}

export function applyAssistedStackMigration(
  doc: PenDocument,
  pageId: string,
  nextStack: ProjectStack,
): PenDocument {
  const nextDoc = withStack(doc, nextStack);
  const currentFrames = doc.ideWorkspace?.frames ?? {};
  const nextFrames = { ...currentFrames };
  for (const frameId of Object.keys(currentFrames)) {
    try {
      const generated = buildDeterministicFrameSource(nextDoc, pageId, frameId);
      const existing = currentFrames[frameId]?.files ?? [];
      const merged = mergeRegeneratedPrimaryFrameFile(existing, generated, {
        conflictStrategy: 'mark_conflict',
      });
      nextFrames[frameId] = {
        ...currentFrames[frameId],
        frameId,
        files: merged,
        dirty: true,
      };
    } catch {
      // ignore orphaned ide frame entries
    }
  }
  return {
    ...nextDoc,
    ideWorkspace: { version: 1, frames: nextFrames },
  };
}

