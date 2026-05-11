import { describe, it, expect } from 'vitest';
import { createEmptyDocument, findNodeInTree, getActivePageChildren } from '@/stores/document-tree-utils';
import { buildDeterministicFrameSource, getEffectiveProjectStack } from '../frame-to-code';
import type { PenDocument, ProjectMetadata } from '@/types/pen';

function withStack(doc: PenDocument, stack: 'react' | 'vue' | 'astro'): PenDocument {
  const meta: ProjectMetadata = {
    creationMode: 'normal',
    type: 'landing',
    projectName: 't',
    policy: { stack, templatePreset: 'p', dashboardMode: 'page' },
    createdAt: new Date().toISOString(),
  };
  return { ...doc, projectMeta: meta };
}

describe('frame-to-code', () => {
  it('defaults stack to react when projectMeta is missing', () => {
    const doc = createEmptyDocument();
    expect(getEffectiveProjectStack(doc)).toBe('react');
  });

  it('builds react source with buildev meta line', () => {
    const doc = withStack(createEmptyDocument(), 'react');
    const pageId = doc.pages?.[0]?.id ?? null;
    const frame = findNodeInTree(getActivePageChildren(doc, pageId), 'root-frame');
    if (frame && frame.type === 'frame') {
      frame.x = 16;
      frame.y = 24;
      frame.opacity = 0.85;
      frame.cornerRadius = 10;
    }
    const { path, content, language } = buildDeterministicFrameSource(doc, 'page-1', 'root-frame');
    expect(path.endsWith('.tsx')).toBe(true);
    expect(language).toBe('typescript');
    expect(content).toContain('// @buildev-frame-meta');
    expect(content).toContain('"width":1200');
    expect(content).toContain('"height":800');
    expect(content.toLowerCase()).toContain('"bg":"#ffffff"');
    expect(content).toContain('"stack":"react"');
    expect(content).toContain('"x":16');
    expect(content).toContain('"y":24');
    expect(content).toContain('"opacity":0.85');
    expect(content).toContain('"cornerRadius":10');
  });

  it('builds vue file path when stack is vue', () => {
    const doc = withStack(createEmptyDocument(), 'vue');
    const { path, content } = buildDeterministicFrameSource(doc, 'page-1', 'root-frame');
    expect(path.endsWith('.vue')).toBe(true);
    expect(content).toContain('<script setup');
  });
});
