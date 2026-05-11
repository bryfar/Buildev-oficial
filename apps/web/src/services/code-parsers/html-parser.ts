import type { FrameNode, ImageNode, PenNode, TextNode } from '@/types/pen';
import { nanoid } from 'nanoid';

function stackHeight(node: PenNode): number {
  const h = 'height' in node ? node.height : undefined;
  return typeof h === 'number' ? h : 0;
}

export function parseHtmlToNodes(html: string): PenNode[] {
  const nodes: PenNode[] = [];
  let currentY = 0;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  if (!body) {
    return createDefaultNodes();
  }

  const elements = body.children;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement;
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') continue;

    const node = htmlElementToPenNode(element, 50, currentY);
    nodes.push(node);
    currentY += stackHeight(node) + 20;
  }

  return nodes.length > 0 ? nodes : createDefaultNodes();
}

function htmlElementToPenNode(element: HTMLElement, x: number, y: number): PenNode {
  const tagName = element.tagName.toLowerCase();
  const width = 300;
  const height = getHtmlHeight(tagName, element);

  const fill = getHtmlBackground(element);
  const border = getHtmlBorder(element);
  const radius = getHtmlRadius(element);
  const text = element.textContent?.trim();

  const fillArr = fill ? [{ type: 'solid' as const, color: fill }] : undefined;
  const strokePen = border
    ? {
        thickness: border.width,
        fill: [{ type: 'solid' as const, color: border.color }],
      }
    : undefined;

  if (tagName === 'img') {
    const node: ImageNode = {
      id: nanoid(),
      type: 'image',
      name: element.getAttribute('alt')?.slice(0, 20) || 'Image',
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      src: element.getAttribute('src') ?? '',
      cornerRadius: radius,
    };
    return node;
  }

  if (
    ['p', 'span', 'a', 'button', 'label', 'li'].includes(tagName) ||
    (tagName.length === 2 && tagName.startsWith('h'))
  ) {
    const node: TextNode = {
      id: nanoid(),
      type: 'text',
      name: text?.slice(0, 20) || tagName,
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: text ?? '',
      fill: fillArr,
    };
    return node;
  }

  const node: FrameNode = {
    id: nanoid(),
    type: 'frame',
    name: text?.substring(0, 20) || tagName,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    children: [],
    fill: fillArr,
    stroke: strokePen,
    cornerRadius: radius,
    explain: JSON.stringify({
      tagName,
      src: element.getAttribute('src'),
      href: element.getAttribute('href'),
      alt: element.getAttribute('alt'),
      text: text && tagName !== 'img' ? text : undefined,
    }),
  };
  return node;
}

function getHtmlHeight(tag: string, element: HTMLElement): number {
  const style = element.style;

  if (style.height) {
    const parsed = parseInt(style.height);
    if (!isNaN(parsed)) return parsed;
  }

  switch (tag) {
    case 'button':
      return 40;
    case 'input':
      return 40;
    case 'img':
      return 200;
    case 'h1':
      return 40;
    case 'h2':
      return 32;
    case 'h3':
      return 28;
    case 'p':
      return 20;
    case 'a':
      return 30;
    case 'ul':
    case 'ol':
      return 100;
    case 'table':
      return 150;
    default:
      return 60;
  }
}

function getHtmlBackground(element: HTMLElement): string | undefined {
  const style = element.style;

  if (style.backgroundColor) {
    return convertColor(style.backgroundColor);
  }

  const className = element.className;
  if (typeof className === 'string') {
    if (className.includes('btn')) return 'rgb(59 130 246)';
    if (className.includes('card')) return 'rgb(255 255 255)';
    if (className.includes('header') || className.includes('nav')) return 'rgb(255 255 255)';
  }

  return undefined;
}

function getHtmlBorder(element: HTMLElement): { color: string; width: number } | undefined {
  const style = element.style;

  if (style.border) {
    const parts = style.border.split(' ');
    if (parts.length >= 2) {
      return {
        color: convertColor(parts[1]) || 'rgb(0 0 0)',
        width: parseInt(parts[0]) || 1,
      };
    }
  }
  return undefined;
}

function getHtmlRadius(element: HTMLElement): number | [number, number, number, number] | undefined {
  const style = element.style;

  if (style.borderRadius) {
    const r = parseInt(style.borderRadius) || 0;
    return [r, r, r, r];
  }
  return undefined;
}

function convertColor(color: string): string {
  if (color.startsWith('#')) {
    if (color.length === 4) {
      const r = parseInt(color[1] + color[1], 16);
      const g = parseInt(color[2] + color[2], 16);
      const b = parseInt(color[3] + color[3], 16);
      return `rgb(${r} ${g} ${b})`;
    }
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${r} ${g} ${b})`;
  }

  if (color.startsWith('rgb')) {
    return color.replace(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/, 'rgb($1 $2 $3)');
  }

  const namedColors: Record<string, string> = {
    white: 'rgb(255 255 255)',
    black: 'rgb(0 0 0)',
    transparent: 'rgb(0 0 0 / 0)',
    red: 'rgb(239 68 68)',
    blue: 'rgb(59 130 246)',
    green: 'rgb(34 197 94)',
    gray: 'rgb(107 114 128)',
  };

  return namedColors[color.toLowerCase()] || color;
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
