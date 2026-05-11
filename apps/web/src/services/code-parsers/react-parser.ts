import type { FrameNode, PenNode } from '@/types/pen';
import { nanoid } from 'nanoid';

interface ReactElement {
  type: string;
  props: Record<string, unknown>;
  children?: ReactElement[];
}

function stackHeight(node: PenNode): number {
  const h = 'height' in node ? node.height : undefined;
  return typeof h === 'number' ? h : 0;
}

export function parseReactToNodes(code: string): PenNode[] {
  const nodes: PenNode[] = [];
  const x = 0;
  let currentY = 0;

  const lines = code.split('\n').filter((line) => line.trim().length > 0);

  for (const line of lines) {
    const jsxElement = parseJsxLine(line);
    if (jsxElement) {
      const node = jsxToPenNode(jsxElement, x, currentY);
      nodes.push(node);
      currentY += stackHeight(node) + 20;
    }
  }

  return nodes.length > 0 ? nodes : createDefaultNodes();
}

function parseJsxLine(line: string): ReactElement | null {
  const match = line.match(/^<(\w+)/);
  if (!match) return null;

  const tagName = match[1];
  if (['div', 'span', 'p', 'button', 'input', 'img', 'a', 'section'].includes(tagName)) {
    return {
      type: tagName,
      props: extractJsxProps(line),
      children: [],
    };
  }
  return null;
}

function extractJsxProps(line: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  const styleMatch = line.match(/style=\{([^}]+)\}/);
  if (styleMatch) {
    props.style = parseStyleObject(styleMatch[1]);
  }

  const classMatch = line.match(/className="([^"]+)"/);
  if (classMatch) {
    props.className = classMatch[1];
  }

  const srcMatch = line.match(/src="([^"]+)"/);
  if (srcMatch) {
    props.src = srcMatch[1];
  }

  const altMatch = line.match(/alt="([^"]+)"/);
  if (altMatch) {
    props.alt = altMatch[1];
  }

  return props;
}

function parseStyleObject(styleStr: string): Record<string, string> {
  const style: Record<string, string> = {};

  const pairs = styleStr.split(',');
  for (const pair of pairs) {
    const [key, value] = pair.split(':').map((s) => s.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[camelKey] = value.replace(/['"]/g, '');
    }
  }

  return style;
}

function jsxToPenNode(element: ReactElement, x: number, y: number): PenNode {
  const props = element.props;
  const style = props.style as Record<string, string> | undefined;
  const className = props.className as string | undefined;

  const width = parseInt(style?.width as string) || 300;
  const height = getHeightFromTag(element.type, style);
  const bgColor = getBackgroundColor(className, style);
  const radius = style?.borderRadius ? parseInt(style.borderRadius, 10) : undefined;

  const node: FrameNode = {
    id: nanoid(),
    type: 'frame',
    name: element.type,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    children: [],
    fill: bgColor ? [{ type: 'solid', color: bgColor }] : undefined,
    cornerRadius: radius !== undefined && !Number.isNaN(radius) ? [radius, radius, radius, radius] : undefined,
    explain: JSON.stringify({ tagName: element.type, props }),
  };
  return node;
}

function getHeightFromTag(tag: string, style?: Record<string, string>): number {
  if (style?.height) {
    return parseInt(style.height) || 60;
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
    case 'h2':
      return 32;
    case 'h3':
      return 28;
    default:
      return 60;
  }
}

function getBackgroundColor(className?: string, style?: Record<string, string>): string | undefined {
  if (style?.backgroundColor) {
    return convertColor(style.backgroundColor);
  }

  if (className?.includes('bg-')) {
    return 'rgb(255 255 255)';
  }

  return undefined;
}

function convertColor(color: string): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${r} ${g} ${b})`;
  }

  const namedColors: Record<string, string> = {
    white: 'rgb(255 255 255)',
    black: 'rgb(0 0 0)',
    transparent: 'rgb(0 0 0 / 0)',
  };

  return namedColors[color] || color;
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
