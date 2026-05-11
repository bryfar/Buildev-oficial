import { createRequire } from 'node:module';
import Module from 'node:module';

const nodeRequire = createRequire(import.meta.url);
if (typeof (globalThis as Record<string, unknown>).require !== 'function') {
  (globalThis as Record<string, unknown>).require = nodeRequire;
}

type ModuleParent = { filename?: string } | undefined;

// Paper's CJS bootstrap (`paper/dist/node/self.js`) does `require('jsdom')`. Vite aliases
// do not apply to that path. Without `canvas`, jsdom's stub canvas breaks booleans.
// Returning `undefined` matches "jsdom not installed" and uses Paper's minimal Node `self`.
const ModuleWithLoad = Module as unknown as {
  _load: (request: string, parent: ModuleParent, isMain: boolean) => unknown;
};
const origLoad = ModuleWithLoad._load;
ModuleWithLoad._load = function (request: string, parent: ModuleParent, isMain: boolean) {
  if (request === 'jsdom') {
    const from = parent?.filename?.replace(/\\/g, '/') ?? '';
    if (from.includes('/paper/dist/node/self.js')) {
      return undefined;
    }
  }
  return origLoad.apply(this, [request, parent, isMain]);
};
