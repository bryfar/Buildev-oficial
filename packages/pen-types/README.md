# @buildev/pen-types

Type definitions for the [Buildev](https://github.com/bryfar/Buildev-oficial) document model.

## Install

```bash
npm install @buildev/pen-types
```

## What's Included

This package provides all TypeScript types and interfaces for the Buildev design file format (`.op`):

- **Document model** — `PenDocument`, `PenPage`, `PenNode` and all node types (`FrameNode`, `RectangleNode`, `EllipseNode`, `TextNode`, `ImageNode`, `PathNode`, etc.)
- **Styles** — `PenFill` (solid, gradient, image), `PenStroke`, `PenEffect` (blur, shadow), `BlendMode`, `StyledTextSegment`
- **Variables & Themes** — `VariableDefinition`, `VariableValue`, `ThemedValue`
- **Canvas state** — `ToolType`, `ViewportState`, `SelectionState`, `CanvasInteraction`
- **UIKit** — `UIKit`, `KitComponent`, `ComponentCategory`
- **Theme presets** — `ThemePreset`, `ThemePresetFile`
- **Design spec** — `DesignMdSpec`, `DesignMdColor`, `DesignMdTypography`

## Usage

```ts
import type { PenDocument, PenNode, FrameNode } from '@buildev/pen-types';
```

## License

MIT
