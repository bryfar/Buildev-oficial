import { defineConfig } from 'vitest/config';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { vitePluginSkills } from '../../packages/pen-ai-skills/vite-plugin-skills';

/** Absolute `apps/web` root — avoids vite-node "File URL path must be absolute" on Windows (e.g. paths with spaces). */
const appWebDir =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

const isVitest = Boolean(process.env.VITEST);
const isElectronBuild = process.env.BUILD_TARGET === 'electron';

// Copy CanvasKit WASM files to public directory for runtime loading
function copyCanvasKitWasm() {
  const wasmDir = path.join(appWebDir, 'public/canvaskit');
  if (!existsSync(wasmDir)) mkdirSync(wasmDir, { recursive: true });
  const ckDir = path.resolve(appWebDir, '../../node_modules/canvaskit-wasm/bin');
  const files = ['canvaskit.wasm'];
  for (const file of files) {
    const src = path.join(ckDir, file);
    const dest = path.join(wasmDir, file);
    if (existsSync(src) && !existsSync(dest)) {
      copyFileSync(src, dest);
    }
  }
}
copyCanvasKitWasm();

const setupReact = path.join(appWebDir, 'src/__tests__/setup-react.ts');
const setupNodeRequire = path.join(appWebDir, 'src/__tests__/setup-node-require.ts');
const testInclude = [
  'src/**/*.test.{ts,tsx}',
  'server/**/*.test.ts',
  '../../packages/*/src/**/*.test.{ts,tsx}',
  '../desktop/git/__tests__/**/*.test.ts',
] as const;

const config = defineConfig({
  // Explicit absolute root fixes Vitest + vite-node on Windows when the repo path contains spaces.
  root: appWebDir,
  test: {
    pool: 'forks',
    teardownTimeout: 1000,
    projects: [
      {
        extends: true,
        test: {
          name: 'boolean-ops',
          root: appWebDir,
          environment: 'node',
          include: ['src/utils/__tests__/boolean-ops.test.ts'],
          setupFiles: [setupNodeRequire],
        },
      },
      {
        extends: true,
        test: {
          name: 'web',
          root: appWebDir,
          include: [...testInclude],
          exclude: ['src/utils/__tests__/boolean-ops.test.ts'],
          setupFiles: [setupReact],
          // System-git tests under `apps/desktop/git` use real repos + Windows temp cleanup
          // (`rm` retries); default 5s is too tight when many workers run in parallel.
          testTimeout: process.platform === 'win32' ? 25_000 : 8_000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.join(appWebDir, 'src'),
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  ssr: {
    external: ['@buildev/agent-native'],
  },
  assetsInclude: ['**/*.wasm'],
  plugins: [
    vitePluginSkills(fileURLToPath(new URL('../../packages/pen-ai-skills', import.meta.url))),
    ...(process.env.NODE_ENV === 'production' || isVitest ? [] : [devtools()]),
    // Nitro + TanStack Start rewrite module resolution and SSR graphs; they break Vitest's
    // vite-node worker on Windows when project paths contain spaces. Tests only need React + aliases.
    ...(isVitest
      ? []
      : [
          nitro({
            rollupConfig: {
              external: [
                /^@sentry\//,
                'canvas',
                'jsdom',
                'cssstyle',
                'canvaskit-wasm',
                '@buildev/agent-native',
              ],
            },
            serverDir: './server',
            output: { dir: '../../out/web' },
            ...(isElectronBuild ? { preset: 'node-server' } : {}),
          }),
        ]),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: [path.join(appWebDir, 'tsconfig.json')],
    }),
    tailwindcss(),
    ...(isVitest ? [] : [tanstackStart()]),
    viteReact(),
  ],
});

export default config;
