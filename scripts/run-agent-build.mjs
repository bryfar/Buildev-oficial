/**
 * Runs `zig build napi` for packages/agent-native.
 *
 * - Set `ZIG` to the full path of `zig.exe` (recommended: Zig **0.15.2**).
 * - Or extract https://ziglang.org/download/0.15.2/zig-x86_64-windows-0.15.2.zip
 *   under `openpencil/.zig-0.15.2/` as either the official inner folder
 *   `zig-x86_64-windows-0.15.2/zig.exe` (next to `lib/`) or a flat extract with `zig.exe` at
 *   `.zig-0.15.2/zig.exe`.
 *
 * Windows: "failed to spawn build runner" is often Defender, Controlled Folder Access, or
 * paths with spaces. Set `BUILDDEV_ZIG_CACHE_ROOT` to a short path without spaces (e.g.
 * `C:\\zig`) to force both caches there. We convert paths to **8.3 only when they contain
 * spaces** (8.3 under `C:\\zig` can trigger AccessDenied on some setups). Run
 * `bun run agent:defender-exclusions`
 * (Administrator) to add Defender exclusions for the usual cache locations.
 *
 * Zig **0.16** is not supported yet (stdlib / build API changes in agent-native).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentNative = join(root, 'packages', 'agent-native');
/** Official zip layout: `zig-x86_64-windows-0.15.2/zig.exe` next to `lib/`. */
const pinnedWinNested = join(root, '.zig-0.15.2', 'zig-x86_64-windows-0.15.2', 'zig.exe');
/** Some extract scripts flatten the zip into `.zig-0.15.2/` directly. */
const pinnedWinFlat = join(root, '.zig-0.15.2', 'zig.exe');

function resolveZigExe() {
  if (process.env.ZIG) return process.env.ZIG;
  if (process.platform === 'win32') {
    if (existsSync(pinnedWinNested)) return pinnedWinNested;
    if (existsSync(pinnedWinFlat)) return pinnedWinFlat;
  }
  return 'zig';
}

function zigVersion(exe) {
  const r = spawnSync(exe, ['version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  return (r.stdout ?? '').trim();
}

/** 8.3 short path (only needed when `full` contains spaces; otherwise keep long path). */
function winShortPathIfSpaced(longAbsPath) {
  if (process.platform !== 'win32' || process.env.ZIG_NO_SHORT_PATH === '1') {
    return resolve(longAbsPath);
  }
  const full = resolve(longAbsPath);
  if (!/\s/.test(full)) return full;
  if (!existsSync(full)) return full;
  const ps = `$f = '${full.replace(/'/g, "''")}'; (New-Object -ComObject Scripting.FileSystemObject).GetFolder($f).ShortPath`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NoLogo', '-Command', ps], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.error || r.status !== 0) return full;
  const s = (r.stdout ?? '').trim().replace(/\r?\n/g, '');
  return s.length > 0 ? s : full;
}

/** Windows defaults avoid %TEMP% and profile dotfolders (often blocked by policy or Defender). */
function defaultProjectCacheDir(zigExe) {
  if (process.env.ZIG_PROJECT_CACHE_DIR) return resolve(process.env.ZIG_PROJECT_CACHE_DIR);
  if (process.platform !== 'win32') return join(agentNative, '.zig-cache');
  const rootCache = process.env.BUILDDEV_ZIG_CACHE_ROOT?.trim();
  if (rootCache) return resolve(rootCache, 'zig-project-cache');
  if (isAbsolute(zigExe) && existsSync(zigExe)) {
    return join(dirname(zigExe), 'zig-build-project-cache');
  }
  return join(root, '.zig-openpencil-project-cache');
}

function defaultGlobalCacheDir(zigExe) {
  if (process.env.ZIG_GLOBAL_CACHE_DIR) return resolve(process.env.ZIG_GLOBAL_CACHE_DIR);
  if (process.platform !== 'win32') return undefined;
  const rootCache = process.env.BUILDDEV_ZIG_CACHE_ROOT?.trim();
  if (rootCache) return resolve(rootCache, 'zig-global-cache');
  if (isAbsolute(zigExe) && existsSync(zigExe)) {
    return join(dirname(zigExe), 'zig-build-global-cache');
  }
  return join(root, '.zig-openpencil-global-cache');
}

function printWinSpawnHint(projectCacheDir, globalCacheDir) {
  console.error('');
  console.error('Windows: "failed to spawn build runner" (FileNotFound or AccessDenied) often means');
  console.error('  - Microsoft Defender or Controlled folder access blocked build.exe, or');
  console.error('  - long paths with spaces (8.3 is used only when the path contains spaces).');
  console.error(`Project cache: ${projectCacheDir}`);
  if (globalCacheDir) console.error(`Global cache: ${globalCacheDir}`);
  console.error('Try: bun run agent:defender-exclusions (Administrator), then bun run agent:build:clean');
  console.error('and agent:build again. If AccessDenied on C:\\zig, check Controlled folder access');
  console.error('in Windows Security, or run: Get-ChildItem C:\\zig -Recurse | Unblock-File (Admin).');
  console.error('Or skip local Zig: bun run agent:fetch-native (see scripts/fetch-agent-native-windows.mjs).');
}

const zig = resolveZigExe();
const ver = zigVersion(zig);
if (!ver) {
  console.error(`Could not run "${zig} version". Install Zig 0.15.x or set ZIG to zig.exe.`);
  process.exit(1);
}
if (ver.startsWith('0.16')) {
  console.error(`Zig ${ver} is not supported for agent-native yet. Use Zig 0.15.2.`);
  console.error('Examples:');
  console.error('  set ZIG=C:\\path\\to\\zig-x86_64-windows-0.15.2\\zig.exe');
  console.error(`  Or extract the 0.15.2 zip so zig.exe exists at: ${pinnedWinNested}`);
  console.error(`  (or flattened at: ${pinnedWinFlat})`);
  process.exit(1);
}

const projectCache = defaultProjectCacheDir(zig);
mkdirSync(projectCache, { recursive: true });

const env = { ...process.env };
let globalCache;
if (process.platform === 'win32') {
  globalCache = defaultGlobalCacheDir(zig);
  mkdirSync(globalCache, { recursive: true });
}

let projectCacheForZig = projectCache;
let globalCacheForZig = globalCache;
let cwdForZig = agentNative;
if (process.platform === 'win32') {
  projectCacheForZig = winShortPathIfSpaced(projectCache);
  if (globalCache) {
    globalCacheForZig = winShortPathIfSpaced(globalCache);
    env.ZIG_GLOBAL_CACHE_DIR = globalCacheForZig;
  }
  cwdForZig = winShortPathIfSpaced(agentNative);
}

const args = ['build'];
if (process.platform === 'win32' && globalCacheForZig) {
  args.push('--global-cache-dir', globalCacheForZig);
}
args.push('--cache-dir', projectCacheForZig, 'napi', '-Doptimize=ReleaseFast');

const res = spawnSync(zig, args, {
  cwd: cwdForZig,
  stdio: 'inherit',
  env,
});

if (res.status !== 0 && process.platform === 'win32') {
  printWinSpawnHint(projectCache, globalCache);
}

process.exit(res.status === null ? 1 : res.status);
