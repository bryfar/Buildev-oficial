import { confirmUnsavedChanges } from '@/hooks/use-electron-menu';
import { isElectron } from '@/utils/file-operations';
import { loadOpFileFromPath } from '@/utils/load-op-file';
import type { RecentFile } from '@/utils/recent-files';

/**
 * Opens a recent project from disk (Electron only when `filePath` is set).
 * Browser builds without a persisted path cannot reopen by path yet.
 */
export async function tryOpenRecentProjectFile(r: RecentFile): Promise<boolean> {
  if (!(await confirmUnsavedChanges())) return false;
  if (!r.filePath || !isElectron()) return false;
  return loadOpFileFromPath(r.filePath);
}
