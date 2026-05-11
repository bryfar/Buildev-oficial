import type { PenIdeVirtualFile } from '@/types/pen';

/**
 * When regenerating from design, replace only the canonical frame file path and
 * keep other virtual files for that frame (auxiliary buffers, notes, etc.).
 */
export function mergeRegeneratedPrimaryFrameFile(
  existing: PenIdeVirtualFile[],
  generated: PenIdeVirtualFile,
  options?: { conflictStrategy?: 'keep_local' | 'accept_generated' | 'mark_conflict'; allowConflictMarkers?: boolean },
): PenIdeVirtualFile[] {
  const paths = existing.map((f) => f.path);
  const seen = new Set<string>();
  for (const p of paths) {
    if (seen.has(p)) {
      console.warn(
        '[buildev:ide-merge] Duplicate virtual paths in workspace (last wins):',
        JSON.stringify(p),
      );
    }
    seen.add(p);
  }

  const prev = existing.find((f) => f.path === generated.path);
  const strategy = options?.conflictStrategy ?? 'accept_generated';
  const useConflictMarkers = options?.allowConflictMarkers !== false;
  let nextPrimary = { ...generated };
  if (prev && prev.content !== generated.content) {
    console.info('[buildev:ide-merge] Replacing virtual file at primary path', {
      path: generated.path,
      previousBytes: prev.content.length,
      nextBytes: generated.content.length,
    });
    if (strategy === 'keep_local') {
      nextPrimary = { ...prev };
    } else if (strategy === 'mark_conflict' && useConflictMarkers) {
      nextPrimary = {
        ...generated,
        content: [
          '<<<<<<< LOCAL_EDITS',
          prev.content.trimEnd(),
          '=======',
          generated.content.trimEnd(),
          '>>>>>>> REGENERATED_FROM_DESIGN',
          '',
        ].join('\n'),
      };
    }
  }

  const map = new Map(existing.map((f) => [f.path, { ...f }]));
  map.set(generated.path, nextPrimary);
  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
}
