/**
 * Windows: skip local Zig (and Defender on build.exe) by placing a prebuilt agent_napi.node.
 *
 * Option A — direct URL:
 *   set AGENT_NATIVE_WINDOWS_URL=https://.../agent_napi.node
 *   bun run agent:fetch-native
 *
 * Option B — GitHub release (public API; optional GITHUB_TOKEN for rate limits):
 *   set AGENT_NATIVE_GITHUB_REPO=owner/repo
 *   optional: AGENT_NATIVE_GITHUB_TAG=v0.7.5   (default: latest release)
 *   optional: AGENT_NATIVE_GITHUB_ASSET=agent_napi-win32-x64.node
 *   bun run agent:fetch-native
 *
 * Writes packages/agent-native/zig-out/napi/agent_napi.node and napi/agent_napi.node
 */
import { copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const zigOut = join(root, 'packages', 'agent-native', 'zig-out', 'napi', 'agent_napi.node');
const napiBundle = join(root, 'packages', 'agent-native', 'napi', 'agent_napi.node');

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (process.platform !== 'win32') {
  die('This fetch flow targets Windows .node. On other OS use `bun run agent:build`.');
}

async function downloadToFile(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'openpencil-agent-fetch/1',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) die(`HTTP ${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 4096) die(`Download too small (${buf.length} bytes); wrong file?`);
  writeFileSync(dest, buf);
}

function pickGithubAsset(assets) {
  const explicit = process.env.AGENT_NATIVE_GITHUB_ASSET?.trim();
  if (explicit) {
    const a = assets.find((x) => x.name === explicit);
    if (a) return a;
    die(`No asset named "${explicit}". Available: ${assets.map((x) => x.name).join(', ')}`);
  }
  const winish = (n) => /win|windows|x64|x86_64|amd64/i.test(n) && /\.node$/i.test(n);
  const candidates = assets.filter((x) => winish(x.name));
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    return candidates.find((x) => /win32|windows|x64/i.test(x.name)) ?? candidates[0];
  }
  const anyNode = assets.find((x) => x.name.endsWith('.node'));
  if (anyNode) return anyNode;
  die(`No suitable .node asset. Available: ${assets.map((x) => x.name).join(', ')}`);
}

async function resolveUrl() {
  const direct = process.env.AGENT_NATIVE_WINDOWS_URL?.trim();
  if (direct) return direct;

  const repo = process.env.AGENT_NATIVE_GITHUB_REPO?.trim();
  if (!repo) {
    die(
      [
        'Set one of:',
        '  AGENT_NATIVE_WINDOWS_URL — direct HTTPS link to agent_napi.node',
        '  AGENT_NATIVE_GITHUB_REPO — owner/repo (GitHub API: latest release)',
        '',
        'Then: bun run agent:fetch-native',
        '',
        'To compile locally: fix Defender / Controlled folder access, then bun run agent:build',
      ].join('\n'),
    );
  }

  const tag = process.env.AGENT_NATIVE_GITHUB_TAG?.trim();
  const path =
    tag && tag !== 'latest'
      ? `https://api.github.com/repos/${repo}/releases/tags/${tag}`
      : `https://api.github.com/repos/${repo}/releases/latest`;

  const res = await fetch(path, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'openpencil-agent-fetch/1',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) die(`GitHub API ${res.status} for ${path}: ${await res.text()}`);
  const data = await res.json();
  const assets = data.assets;
  if (!Array.isArray(assets) || assets.length === 0) die('Release has no assets.');
  const asset = pickGithubAsset(assets);
  return asset.browser_download_url;
}

async function main() {
  const url = await resolveUrl();
  console.log(`Downloading: ${url}`);
  await downloadToFile(url, zigOut);
  mkdirSync(dirname(napiBundle), { recursive: true });
  copyFileSync(zigOut, napiBundle);
  const st = statSync(zigOut);
  console.log(`OK: wrote ${zigOut} (${st.size} bytes) and copied to ${napiBundle}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
