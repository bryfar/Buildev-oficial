/**
 * Deletes Zig build caches used by agent:build (Windows and repo-local defaults).
 * Run from openpencil root: bun run agent:build:clean
 */
import { existsSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pinnedNested = join(root, '.zig-0.15.2', 'zig-x86_64-windows-0.15.2', 'zig.exe');
const pinnedFlat = join(root, '.zig-0.15.2', 'zig.exe');

const dirs = [
  join(root, '.zig-0.15.2', 'zig-build-project-cache'),
  join(root, '.zig-0.15.2', 'zig-build-global-cache'),
  join(root, '.zig-openpencil-project-cache'),
  join(root, '.zig-openpencil-global-cache'),
  join(root, 'packages', 'agent-native', '.zig-cache'),
  resolve(homedir(), '.openpencil-zig-project-cache'),
  resolve(homedir(), '.openpencil-zig-global-cache'),
  resolve(tmpdir(), 'openpencil-zig-project-cache'),
  resolve(tmpdir(), 'openpencil-zig-global-cache'),
];

const br = process.env.BUILDDEV_ZIG_CACHE_ROOT?.trim();
if (br) {
  dirs.push(resolve(br, 'zig-project-cache'), resolve(br, 'zig-global-cache'));
}
if (process.env.ZIG_PROJECT_CACHE_DIR) dirs.push(resolve(process.env.ZIG_PROJECT_CACHE_DIR));
if (process.env.ZIG_GLOBAL_CACHE_DIR) dirs.push(resolve(process.env.ZIG_GLOBAL_CACHE_DIR));

function zigDir() {
  if (existsSync(pinnedNested)) return dirname(pinnedNested);
  if (existsSync(pinnedFlat)) return dirname(pinnedFlat);
  return null;
}
const zd = zigDir();
if (zd) {
  dirs.push(join(zd, 'zig-build-project-cache'), join(zd, 'zig-build-global-cache'));
}

let n = 0;
for (const d of [...new Set(dirs)]) {
  if (!existsSync(d)) continue;
  rmSync(d, { recursive: true, force: true });
  console.log(`Removed: ${d}`);
  n++;
}
console.log(n ? `[agent:build:clean] removed ${n} cache tree(s).` : '[agent:build:clean] nothing to remove.');
