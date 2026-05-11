// apps/desktop/git/__tests__/test-helpers.ts
//
// Shared test utilities for the desktop git layer tests. Each test creates
// a fresh temp dir, runs its operation, and cleans up via the returned
// disposer. This keeps tests isolated and parallel-safe.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

/**
 * Point a bare repo's HEAD at `refs/heads/<branch>` so a plain `git clone`
 * checks out that branch (Git for Windows often defaults to `master` otherwise).
 */
export async function setBareRemoteDefaultBranch(bareRepoDir: string, branch: string): Promise<void> {
  await execFileAsync('git', ['-C', bareRepoDir, 'symbolic-ref', 'HEAD', `refs/heads/${branch}`]);
}

/**
 * Create a fresh temp directory under the OS temp path. Returns the path
 * and a disposer that recursively removes it. Always pair the call with
 * `try { ... } finally { await dispose(); }`.
 */
export async function mkTempDir(prefix = 'op-git-test-'): Promise<{
  dir: string;
  dispose: () => Promise<void>;
}> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  return {
    dir,
    dispose: async () => {
      await rm(dir, {
        recursive: true,
        force: true,
        maxRetries: 12,
        retryDelay: 75,
      });
    },
  };
}

/**
 * Write a stub `.op` file (a tiny PenDocument JSON) into a directory.
 * Returns the absolute file path.
 */
export async function writeOpFile(
  dir: string,
  name: string,
  content: object = { version: '1.0.0', children: [] },
): Promise<string> {
  const path = join(dir, name);
  await writeFile(path, JSON.stringify(content), 'utf-8');
  return path;
}

/**
 * Create a nested directory structure under a temp root.
 * Useful for setting up "file inside parent git repo" scenarios.
 */
export async function mkSubdir(root: string, ...segments: string[]): Promise<string> {
  const dir = join(root, ...segments);
  await mkdir(dir, { recursive: true });
  return dir;
}
