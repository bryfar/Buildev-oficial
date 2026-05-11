/**
 * Deterministic channel C: Pen frame subtree → virtual source file for IDE.
 * Output includes a machine-readable first line for channel A (subset).
 */
import type { PenDocument, PenNode, ProjectStack } from '@/types/pen';
import { findNodeInTree, getActivePageChildren } from '@/stores/document-tree-utils';

const META_PREFIX = '// @buildev-frame-meta ';

export function getEffectiveProjectStack(doc: PenDocument): ProjectStack {
  return doc.projectMeta?.policy?.stack ?? 'react';
}

export function frameSourcePath(pageId: string, frameId: string, stack: ProjectStack): string {
  const ext = stack === 'vue' ? 'vue' : stack === 'astro' ? 'astro' : 'tsx';
  return `src/pages/${pageId}/frames/${frameId}.${ext}`;
}

/** Exported for channel A comparison against meta `bg`. */
export function frameFillCssColor(node: PenNode): string {
  if (node.type !== 'frame' && node.type !== 'rectangle') return '#ffffff';
  const fill = 'fill' in node ? node.fill : undefined;
  if (!fill || !Array.isArray(fill) || fill.length === 0) return '#ffffff';
  const f = fill[0];
  if (f && typeof f === 'object' && 'type' in f && f.type === 'solid' && 'color' in f && typeof f.color === 'string') {
    return f.color;
  }
  return '#ffffff';
}

function numSize(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function safeComponentName(frameId: string): string {
  const s = frameId.replace(/[^a-zA-Z0-9_]/g, '_');
  return s.length > 0 ? `Frame_${s}` : 'FrameRoot';
}

/**
 * Build the canonical virtual file for a frame from the current Pen document.
 */
export function buildDeterministicFrameSource(
  doc: PenDocument,
  pageId: string,
  frameId: string,
): { path: string; content: string; language: string } {
  const children = getActivePageChildren(doc, pageId);
  const node = findNodeInTree(children, frameId);
  if (!node || node.type !== 'frame') {
    throw new Error(`[frame-to-code] Frame node not found: ${frameId}`);
  }
  const stack = getEffectiveProjectStack(doc);
  const w = numSize(node.width, 1200);
  const h = numSize(node.height, 800);
  const bg = frameFillCssColor(node);
  const meta = JSON.stringify({
    frameId,
    width: w,
    height: h,
    bg,
    stack,
    ...(typeof node.x === 'number' ? { x: node.x } : {}),
    ...(typeof node.y === 'number' ? { y: node.y } : {}),
    ...(typeof node.opacity === 'number' ? { opacity: node.opacity } : {}),
    ...(typeof node.cornerRadius === 'number' ? { cornerRadius: node.cornerRadius } : {}),
  });
  const path = frameSourcePath(pageId, frameId, stack);
  const comp = safeComponentName(frameId);

  if (stack === 'vue') {
    const content = `<script setup lang="ts">
${META_PREFIX}${meta}
const meta = ${meta} as { frameId: string; width: number; height: number };
const bg = '${bg}' as const;
</script>
<template>
  <div
    data-buildev-frame-root
    :style="{ width: meta.width + 'px', height: meta.height + 'px', backgroundColor: bg, position: 'relative' }"
  />
</template>
`;
    return { path, content, language: 'html' };
  }

  if (stack === 'astro') {
    const content = `---
${META_PREFIX}${meta}
const meta = ${meta} as const;
const bg = '${bg}';
---
<div
  data-buildev-frame-root
  style={\`width:\${meta.width}px;height:\${meta.height}px;background:\${bg};position:relative\`}
></div>
`;
    return { path, content, language: 'astro' };
  }

  // react (default)
  const content = `${META_PREFIX}${meta}
import type { CSSProperties } from 'react';

export default function ${comp}() {
  const style: CSSProperties = {
    width: ${w},
    height: ${h},
    backgroundColor: '${bg}',
    position: 'relative',
  };
  return <div data-buildev-frame-root style={style} />;
}
`;
  return { path, content, language: 'typescript' };
}
