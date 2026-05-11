import type { FrameNode, PenNode, TextNode } from '@/types/pen';
import { nanoid } from 'nanoid';

interface VueElement {
  tag: string;
  attrs: Record<string, string>;
  children?: VueElement[];
  text?: string;
}

function stackHeight(node: PenNode): number {
  const h = 'height' in node ? node.height : undefined;
  return typeof h === 'number' ? h : 0;
}

export function parseVueToNodes(code: string): PenNode[] {
  const nodes: PenNode[] = [];
  let currentY = 0;

  const templateMatch = code.match(/<template>([\s\S]*)<\/template>/);
  if (!templateMatch) {
    return createDefaultNodes();
  }

  const templateContent = templateMatch[1];
  const lines = templateContent.split('\n').filter((line) => line.trim().length > 0);

  for (const line of lines) {
    const element = parseVueElement(line);
    if (element) {
      const node = vueElementToPenNode(element, 50, currentY);
      nodes.push(node);
      currentY += stackHeight(node) + 20;
    }
  }

  return nodes.length > 0 ? nodes : createDefaultNodes();
}

function parseVueElement(line: string): VueElement | null {
  const selfClosing = line.includes('/>');
  const match = line.match(/<(\w+)/);

  if (!match) {
    if (line.includes('>') && !line.includes('</')) {
      const textMatch = line.match(/>([^<]+)</);
      if (textMatch) {
        return {
          tag: 'text',
          attrs: {},
          text: textMatch[1].trim(),
        };
      }
    }
    return null;
  }

  const tagName = match[1];
  const attrs: Record<string, string> = {};

  const attrMatches = line.matchAll(/(\w+)="([^"]+)"/g);
  for (const m of attrMatches) {
    attrs[m[1]] = m[2];
  }

  const classMatch = line.match(/class="([^"]+)"/);
  if (classMatch) {
    attrs.class = classMatch[1];
  }

  const styleMatch = line.match(/:style="([^"]+)"/);
  if (styleMatch) {
    attrs.style = styleMatch[1];
  }

  return {
    tag: tagName,
    attrs,
    children: selfClosing ? undefined : [],
  };
}

function vueElementToPenNode(element: VueElement, x: number, y: number): PenNode {
  const { tag, attrs } = element;
  const width = 300;
  const height = getVueHeight(tag, attrs);

  const fill = attrs.style ? extractVueStyle(attrs.style, 'background-color') : undefined;

  if (tag === 'text') {
    const node: TextNode = {
      id: nanoid(),
      type: 'text',
      name: element.text || 'Text',
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: element.text ?? '',
      fill: fill ? [{ type: 'solid', color: convertColor(fill) }] : undefined,
    };
    return node;
  }

  const node: FrameNode = {
    id: nanoid(),
    type: 'frame',
    name: tag,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    children: [],
    fill: fill ? [{ type: 'solid', color: convertColor(fill) }] : undefined,
    explain: JSON.stringify({ ...attrs, text: element.text, tagName: tag }),
  };
  return node;
}

function getVueHeight(tag: string, attrs: Record<string, string>): number {
  if (attrs.style?.includes('height')) {
    const match = attrs.style.match(/height:\s*(\d+)/);
    if (match) return parseInt(match[1]);
  }

  switch (tag) {
    case 'button':
      return 40;
    case 'input':
      return 40;
    case 'img':
      return 200;
    case 'p':
      return 20;
    case 'h1':
      return 40;
    case 'span':
    case 'div':
    default:
      return 60;
  }
}

function extractVueStyle(style: string, prop: string): string | undefined {
  const match = style.match(new RegExp(`${prop}:\\s*([^;]+)`));
  return match?.[1].trim();
}

function convertColor(color: string): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${r} ${g} ${b})`;
  }
  return color;
}

function createDefaultNodes(): PenNode[] {
  const node: FrameNode = {
    id: nanoid(),
    type: 'frame',
    name: 'Container',
    x: 50,
    y: 50,
    width: 400,
    height: 60,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    children: [],
  };
  return [node];
}
