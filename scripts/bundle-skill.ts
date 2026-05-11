/**
 * Pre-build script: reads a sibling skill repo and generates a JSON bundle
 * embedded into the CLI binary by esbuild.
 *
 * Resolution order for the skill repo root:
 * 1. `SKILL_ROOT` env (absolute path to the skill repository)
 * 2. `<workspace-parent>/buildev-skill`
 * 3. `<workspace-parent>/openpencil-skill` (legacy clone name)
 *
 * Usage: bun scripts/bundle-skill.ts
 * Output: apps/cli/src/commands/skill-bundle.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Parent of `openpencil/` (monorepo lives in `openpencil/`). */
const WORKSPACE_PARENT = resolve(__dirname, '../..');

function resolveSkillRoot(): string | null {
  if (process.env.SKILL_ROOT) {
    const p = resolve(process.env.SKILL_ROOT);
    if (existsSync(p)) return p;
    console.error(`SKILL_ROOT is set but path does not exist: ${p}`);
    return null;
  }
  for (const dirName of ['buildev-skill', 'openpencil-skill']) {
    const p = join(WORKSPACE_PARENT, dirName);
    if (existsSync(p)) return p;
  }
  return null;
}

const SKILL_ROOT = resolveSkillRoot();
const OUT = resolve(__dirname, '../apps/cli/src/commands/skill-bundle.json');

function designSkillRelativePath(): string {
  if (!SKILL_ROOT) return 'skills/buildev-design/SKILL.md';
  const buildev = join(SKILL_ROOT, 'skills/buildev-design/SKILL.md');
  const legacy = join(SKILL_ROOT, 'skills/openpencil-design/SKILL.md');
  if (existsSync(buildev)) return 'skills/buildev-design/SKILL.md';
  if (existsSync(legacy)) return 'skills/openpencil-design/SKILL.md';
  return 'skills/buildev-design/SKILL.md';
}

const FILES = [
  designSkillRelativePath(),
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  '.cursor-plugin/plugin.json',
  'package.json',
  'GEMINI.md',
  'gemini-extension.json',
];

function main(): void {
  if (!SKILL_ROOT) {
    console.error('Skill repo not found. Set SKILL_ROOT or clone next to this repo as buildev-skill or openpencil-skill.');
    console.error(`Looked under: ${WORKSPACE_PARENT}`);
    console.error('Skipping skill bundle — install command will use git clone fallback.');
    writeFileSync(OUT, JSON.stringify({ version: '', files: {} }, null, 2) + '\n');
    return;
  }

  const pkg = JSON.parse(readFileSync(join(SKILL_ROOT, 'package.json'), 'utf-8'));
  const bundle: Record<string, string> = {};

  for (const file of FILES) {
    const fullPath = join(SKILL_ROOT, file);
    if (existsSync(fullPath)) {
      bundle[file] = readFileSync(fullPath, 'utf-8');
    }
  }

  const output = { version: pkg.version as string, files: bundle };
  writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');
  console.log(`Bundled ${Object.keys(bundle).length} skill files (v${pkg.version}) from ${SKILL_ROOT} → ${OUT}`);
}

main();
