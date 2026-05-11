import type { ProjectStack } from '@/types/pen';

/** Minimal placeholder for a new aux virtual file (not the deterministic primary). */
export function initialContentForNewVirtualFile(path: string, stack: ProjectStack): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.vue')) {
    return `<script setup lang="ts">
// Auxiliary virtual file
</script>
<template>
  <div />
</template>
`;
  }
  if (lower.endsWith('.astro')) {
    return `---
// Auxiliary virtual file
---
<div />
`;
  }
  if (lower.endsWith('.tsx') || lower.endsWith('.ts')) {
    const tsx = lower.endsWith('.tsx');
    if (stack === 'react' && tsx) {
      return `/** Auxiliary virtual file */\nexport default function Aux() {\n  return null;\n}\n`;
    }
    return `/** Auxiliary virtual file */\nexport {};\n`;
  }
  return `/* New virtual file */\n`;
}
