/** Start/stop Buildev app from the CLI. */

import { spawn, fork, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { getAppInfo } from './connection';

const IS_WIN = process.platform === 'win32';
const PORT_FILE_DIR = join(homedir(), '.buildev');
const PORT_FILE_PATH = join(PORT_FILE_DIR, '.port');

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const { port } = addr;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get free port'));
      }
    });
    server.on('error', reject);
  });
}

async function waitForPortFile(timeoutMs = 15_000): Promise<{ port: number; pid: number }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await getAppInfo();
    if (info) return { port: info.port, pid: info.pid };
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Timeout waiting for Buildev to start');
}

/** Find the installed desktop app binary. */
function findDesktopBinary(): string | null {
  const candidates: string[] = [];

  if (process.platform === 'darwin') {
    candidates.push('/Applications/Buildev.app/Contents/MacOS/Buildev');
    candidates.push(
      join(homedir(), 'Applications', 'Buildev.app', 'Contents', 'MacOS', 'Buildev'),
    );
  } else if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
    const programFiles = process.env.PROGRAMFILES ?? 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)';
    // NSIS per-user install (default)
    candidates.push(join(localAppData, 'Programs', 'buildev', 'Buildev.exe'));
    // NSIS per-machine install
    candidates.push(join(programFiles, 'Buildev', 'Buildev.exe'));
    candidates.push(join(programFilesX86, 'Buildev', 'Buildev.exe'));
    // Portable — same directory as CLI
    candidates.push(join(__dirname, '..', 'Buildev.exe'));
  } else {
    // Linux — AppImage, deb, snap, flatpak, manual
    candidates.push('/usr/bin/buildev');
    candidates.push('/usr/local/bin/buildev');
    candidates.push(join(homedir(), '.local', 'bin', 'buildev'));
    // AppImage in common download locations
    const appImageDirs = [
      join(homedir(), 'Applications'),
      join(homedir(), 'Downloads'),
      join(homedir(), '.local', 'share', 'applications'),
    ];
    for (const dir of appImageDirs) {
      // Match Buildev*.AppImage (version may vary)
      try {
        if (existsSync(dir)) {
          const files = require('node:fs').readdirSync(dir) as string[];
          const appImage = files.find(
            (f: string) => f.startsWith('Buildev') && f.endsWith('.AppImage'),
          );
          if (appImage) candidates.push(join(dir, appImage));
        }
      } catch {
        /* skip */
      }
    }
    // Snap
    candidates.push('/snap/bin/buildev');
    // Flatpak
    candidates.push('/var/lib/flatpak/exports/bin/dev.buildev.app');
    candidates.push(
      join(homedir(), '.local', 'share', 'flatpak', 'exports', 'bin', 'dev.buildev.app'),
    );
  }

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

/** Find the Nitro server entry relative to CLI's location. */
function findServerEntry(): string | null {
  // When compiled, __dirname points to dist/
  // Server is at ../../out/web/server/index.mjs or relative to monorepo root
  const candidates = [
    join(__dirname, '..', '..', '..', 'out', 'web', 'server', 'index.mjs'),
    join(__dirname, '..', '..', 'out', 'web', 'server', 'index.mjs'),
    join(__dirname, '..', 'server', 'index.mjs'), // when bundled in Electron resources
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

export async function startDesktop(): Promise<{ port: number; pid: number }> {
  const info = await getAppInfo();
  if (info) return { port: info.port, pid: info.pid };

  const binary = findDesktopBinary();
  if (!binary) {
    throw new Error(
      'Buildev desktop app not found. Install it or use `op start --web` for the web server.',
    );
  }

  const child = spawn(binary, [], {
    detached: true,
    stdio: 'ignore',
    ...(IS_WIN ? { windowsHide: true, shell: false } : {}),
  });
  child.unref();

  return waitForPortFile();
}

export async function startWeb(): Promise<{ port: number; pid: number }> {
  const info = await getAppInfo();
  if (info) return { port: info.port, pid: info.pid };

  const entry = findServerEntry();
  if (!entry) {
    throw new Error(
      'Nitro server not found. Run `bun run build` first, or use `op start --desktop`.',
    );
  }

  const port = await getFreePort();

  const child = fork(entry, [], {
    detached: true,
    stdio: 'ignore',
    ...(IS_WIN ? { windowsHide: true } : {}),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: String(port),
    },
  });
  child.unref();

  // Write port file (the Nitro plugin also writes it, but write early for faster discovery)
  await mkdir(PORT_FILE_DIR, { recursive: true });
  await writeFile(
    PORT_FILE_PATH,
    JSON.stringify({ port, pid: child.pid, timestamp: Date.now() }),
    'utf-8',
  );

  return { port, pid: child.pid! };
}

export async function stopApp(): Promise<boolean> {
  const info = await getAppInfo();
  if (!info) return false;

  try {
    if (IS_WIN) {
      // Windows: SIGTERM is not supported, use taskkill for graceful shutdown
      execSync(`taskkill /PID ${info.pid}`, { stdio: 'ignore' });
    } else {
      process.kill(info.pid, 'SIGTERM');
    }
  } catch {
    // already dead — try force kill on Windows
    if (IS_WIN) {
      try {
        execSync(`taskkill /F /PID ${info.pid}`, { stdio: 'ignore' });
      } catch {
        /* ignore */
      }
    }
  }

  try {
    await unlink(PORT_FILE_PATH);
  } catch {
    // ignore
  }

  return true;
}
