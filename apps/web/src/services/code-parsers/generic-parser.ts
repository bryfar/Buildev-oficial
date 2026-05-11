import type { FrameNode, PenNode } from '@/types/pen';
import { nanoid } from 'nanoid';

function stackHeight(node: PenNode): number {
  const h = 'height' in node ? node.height : undefined;
  return typeof h === 'number' ? h : 0;
}

function frameBlock(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fillRgb: string,
  explain: string,
): FrameNode {
  return {
    id: nanoid(),
    type: 'frame',
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    children: [],
    fill: [{ type: 'solid', color: fillRgb }],
    explain,
  };
}

export function parseGenericToNodes(code: string): PenNode[] {
  const nodes: PenNode[] = [];
  let currentY = 50;
  const x = 50;

  const blocks = splitIntoBlocks(code);

  for (const block of blocks) {
    if (block.trim().length === 0) continue;

    const node = parseBlockToNode(block, x, currentY);
    nodes.push(node);
    currentY += stackHeight(node) + 20;
  }

  return nodes.length > 0 ? nodes : createDefaultNodes(code);
}

function splitIntoBlocks(code: string): string[] {
  const blocks: string[] = [];
  const lines = code.split('\n');

  let currentBlock = '';
  let braceCount = 0;
  let inString = false;

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i - 1] !== '\\') {
        inString = !inString;
      }
    }

    if (!inString) {
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
    }

    currentBlock += line + '\n';

    if (braceCount === 0 && currentBlock.trim().length > 0) {
      blocks.push(currentBlock.trim());
      currentBlock = '';
    }
  }

  if (currentBlock.trim().length > 0) {
    blocks.push(currentBlock.trim());
  }

  return blocks;
}

function parseBlockToNode(block: string, x: number, y: number): PenNode {
  const firstLine = block.split('\n')[0];

  if (block.includes('function') || block.includes('const ') || block.includes('let ') || block.includes('var ')) {
    return createFunctionNode(block, x, y, firstLine);
  }

  if (block.includes('class ')) {
    return createClassNode(block, x, y, firstLine);
  }

  if (block.includes('if') || block.includes('for') || block.includes('while')) {
    return createControlNode(block, x, y, firstLine);
  }

  return createGenericNode(block, x, y, firstLine);
}

function createFunctionNode(block: string, x: number, y: number, signature: string): PenNode {
  const nameMatch = signature.match(/(?:function|const|let|var)\s+(\w+)/);
  const name = nameMatch?.[1] || 'Function';

  const lines = block.split('\n').length;
  const height = Math.max(60, lines * 20);

  return frameBlock(name, x, y, 400, height, 'rgb(30 41 59)', JSON.stringify({ codeType: 'function', code: block }));
}

function createClassNode(block: string, x: number, y: number, signature: string): PenNode {
  const nameMatch = signature.match(/class\s+(\w+)/);
  const name = nameMatch?.[1] || 'Class';

  const lines = block.split('\n').length;
  const height = Math.max(80, lines * 20);

  return frameBlock(name, x, y, 400, height, 'rgb(88 28 135)', JSON.stringify({ codeType: 'class', code: block }));
}

function createControlNode(block: string, x: number, y: number, signature: string): PenNode {
  const keywordMatch = signature.match(/(if|for|while|switch)\s*\(/);
  const name = keywordMatch?.[1] || 'Control';

  const lines = block.split('\n').length;
  const height = Math.max(40, lines * 18);

  return frameBlock(name, x, y, 350, height, 'rgb(180 83 9)', JSON.stringify({ codeType: 'control', code: block }));
}

function createGenericNode(block: string, x: number, y: number, firstLine: string): PenNode {
  const lines = block.split('\n').length;
  const height = Math.max(40, lines * 18);
  const preview = firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;

  return frameBlock(preview, x, y, 350, height, 'rgb(75 85 99)', JSON.stringify({ codeType: 'generic', code: block }));
}

function createDefaultNodes(code: string): PenNode[] {
  return [
    frameBlock('Code Block', 50, 50, 400, 100, 'rgb(30 41 59)', JSON.stringify({ code })),
  ];
}
