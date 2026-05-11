# pen-sdk

Umbrella SDK that re-exports all Buildev packages from a single entry point.

## Structure

- `src/index.ts` — Single barrel file re-exporting from:
  - `@buildev/pen-types` — All document model types and codegen types
  - `@buildev/pen-core` — Tree operations, layout engine, variables, normalization, boolean ops
  - `@buildev/pen-engine` — `DesignEngine` and all managers
  - `@buildev/pen-react` — All hooks, components, and stores (`export *`)
  - `@buildev/pen-renderer` — `PenRenderer`, CanvasKit loader, low-level rendering utilities
  - `@buildev/pen-figma` — Figma file parser and converter

## Usage

```ts
import {
  type PenDocument,
  createEmptyDocument,
  DesignEngine,
  DesignProvider,
  useDocument,
  PenRenderer,
  parseFigFile,
} from '@buildev/pen-sdk';
```

Consumers can import from `@buildev/pen-sdk` instead of individual packages. All types, runtime exports, and React hooks are available.
