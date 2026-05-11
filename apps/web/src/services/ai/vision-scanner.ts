import type {
  EllipseNode,
  FrameNode,
  ImageNode,
  LineNode,
  PathNode,
  PenNode,
  RectangleNode,
  TextNode,
} from '@/types/pen';
import { nanoid } from 'nanoid';

const VISION_SYSTEM_PROMPT = `Eres un experto en convertir diseños visuales en estructuras de datos de Buildev.

OBJETIVO:
Convierte la imagen recibida en nodos JSON que sigan ESTRICTAMENTE el esquema Buildev PenNode.

REGLAS ESTRUCTURALES:
1. Cada nodo debe tener: type, id único, x, y, width, height, rotation (0 por defecto)
2. Tipos de nodos disponibles: "RECT", "ELLIPSE", "TEXT", "FRAME", "LINE", "VECTOR"
3. Para contenedores usa "FRAME" con children
4. Props de estilo: fill (color), stroke (color y width), cornerRadius, opacity
5. Para texto: type "TEXT" con contenido en propiedad "text"
6. Para imágenes: type "RECT" con "imageUrl" en props
7. Para vectores: type "VECTOR" con "svgPath"
8. Para grupos relacionados: envolver en FRAME
9. Usar coordenadas relativas al canvas (0,0 es esquina superior izquierda)
10. Estimar tamaños razonables (mín 20px para elementos pequeños)

DISENO PREMIUM:
- Usar códigos HEX exactos para colores
- Estimar padding/margin para equilibrio visual
- Implementar jerarquía visual (títulos grandes, textos pequeños)
- Detectar alignment (left, center, right)
- Identificar spacings consistentes

OUTPUT:
- Devuelve ÚNICAMENTE un array JSON válido de nodos
- No añadas explicaciones ni markdown
- Formato: [{ "type": "RECT", "x": 0, "y": 0, "width": 100, "height": 50, "fill": "#ffffff", ... }]`;

const VISION_USER_PROMPT = `Analiza esta imagen y conviértela en nodos de Buildev.
Descompón el diseño en:
- Contenedores principales (FRAME)
- Elementos individuales (RECT, ELLIPSE, TEXT, VECTOR)
- Imágenes
- Jerarquía visual (títulos, textos, botones)

Devuelve solo el JSON de nodos, sin texto adicional.`;

interface VisionNode {
  type: 'RECT' | 'ELLIPSE' | 'TEXT' | 'FRAME' | 'LINE' | 'VECTOR';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  opacity?: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  imageUrl?: string;
  svgPath?: string;
  children?: VisionNode[];
  [key: string]: unknown;
}

function solidFills(hex: string): NonNullable<RectangleNode['fill']> {
  return [{ type: 'solid', color: hexToRgba(hex) }];
}

function solidStroke(color: string, width: number): NonNullable<LineNode['stroke']> {
  return {
    thickness: width,
    fill: [{ type: 'solid', color: hexToRgba(color) }],
  };
}

function radiusCorners(r: number): [number, number, number, number] {
  return [r, r, r, r];
}

function createPenNode(visionNode: VisionNode): PenNode {
  const id = nanoid();
  const base = {
    id,
    x: visionNode.x,
    y: visionNode.y,
    rotation: visionNode.rotation ?? 0,
    opacity: visionNode.opacity ?? 1,
    visible: true as const,
    locked: false as const,
  };

  switch (visionNode.type) {
    case 'FRAME': {
      const node: FrameNode = {
        ...base,
        type: 'frame',
        name: 'Frame',
        width: visionNode.width,
        height: visionNode.height,
        children: visionNode.children?.map(createPenNode) ?? [],
        fill: visionNode.fill ? solidFills(visionNode.fill) : undefined,
        stroke: visionNode.stroke
          ? solidStroke(visionNode.stroke, visionNode.strokeWidth ?? 1)
          : undefined,
        cornerRadius: visionNode.cornerRadius
          ? radiusCorners(visionNode.cornerRadius)
          : undefined,
      };
      return node;
    }
    case 'TEXT': {
      const content = visionNode.text ?? '';
      const node: TextNode = {
        ...base,
        type: 'text',
        name: content.slice(0, 20) || 'Text',
        width: visionNode.width,
        height: visionNode.height,
        content,
        fontFamily: visionNode.fontFamily ?? 'Inter',
        fontSize: visionNode.fontSize ?? 16,
        fontWeight: visionNode.fontWeight ?? 400,
        textAlign: visionNode.textAlign ?? 'left',
        fill: visionNode.fill ? solidFills(visionNode.fill) : undefined,
      };
      return node;
    }
    case 'RECT': {
      if (visionNode.imageUrl) {
        const node: ImageNode = {
          ...base,
          type: 'image',
          name: 'Image',
          src: visionNode.imageUrl,
          width: visionNode.width,
          height: visionNode.height,
          cornerRadius: visionNode.cornerRadius
            ? radiusCorners(visionNode.cornerRadius)
            : undefined,
        };
        return node;
      }
      const node: RectangleNode = {
        ...base,
        type: 'rectangle',
        name: 'Rectangle',
        width: visionNode.width,
        height: visionNode.height,
        fill: visionNode.fill ? solidFills(visionNode.fill) : undefined,
        stroke: visionNode.stroke
          ? solidStroke(visionNode.stroke, visionNode.strokeWidth ?? 1)
          : undefined,
        cornerRadius: visionNode.cornerRadius
          ? radiusCorners(visionNode.cornerRadius)
          : undefined,
      };
      return node;
    }
    case 'ELLIPSE': {
      const node: EllipseNode = {
        ...base,
        type: 'ellipse',
        name: 'Ellipse',
        width: visionNode.width,
        height: visionNode.height,
        fill: visionNode.fill ? solidFills(visionNode.fill) : undefined,
        stroke: visionNode.stroke
          ? solidStroke(visionNode.stroke, visionNode.strokeWidth ?? 1)
          : undefined,
        cornerRadius: visionNode.cornerRadius,
      };
      return node;
    }
    case 'LINE': {
      const node: LineNode = {
        ...base,
        type: 'line',
        name: 'Line',
        x2: visionNode.x + visionNode.width,
        y2: visionNode.y + visionNode.height,
        stroke: visionNode.stroke
          ? solidStroke(visionNode.stroke, visionNode.strokeWidth ?? 1)
          : solidStroke('#000000', visionNode.strokeWidth ?? 1),
      };
      return node;
    }
    case 'VECTOR': {
      const node: PathNode = {
        ...base,
        type: 'path',
        name: 'Path',
        d: visionNode.svgPath ?? '',
        width: visionNode.width,
        height: visionNode.height,
        fill: visionNode.fill ? solidFills(visionNode.fill) : undefined,
        stroke: visionNode.stroke
          ? solidStroke(visionNode.stroke, visionNode.strokeWidth ?? 1)
          : undefined,
      };
      return node;
    }
  }
}

function hexToRgba(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r} ${g} ${b})`;
}

export async function scanImageToNodes(
  imageData: string,
  context?: string,
): Promise<PenNode[]> {
  const { streamChat } = await import('./ai-service');

  const messages = [
    {
      role: 'user' as const,
      content: context
        ? `${VISION_USER_PROMPT}\n\nContexto: ${context}`
        : VISION_USER_PROMPT,
      attachments: [
        {
          name: 'screenshot.png',
          mediaType: 'image/png',
          data: imageData,
        },
      ],
    },
  ];

  const chunks: string[] = [];
  for await (const chunk of streamChat(
    VISION_SYSTEM_PROMPT,
    messages,
    undefined,
    { noTextTimeoutMs: 60000 },
    undefined,
    undefined,
  )) {
    if (chunk.type === 'text' && chunk.content) {
      chunks.push(chunk.content);
    }
  }

  const fullResponse = chunks.join('');
  return parseVisionResponse(fullResponse);
}

function parseVisionResponse(response: string): PenNode[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const nodes = JSON.parse(jsonMatch[0]) as VisionNode[];
    return nodes.map(createPenNode);
  } catch (error) {
    console.error('[VisionScanner] Failed to parse response:', error);
    return [];
  }
}

export async function scanImageFromUrl(
  imageUrl: string,
  context?: string,
): Promise<PenNode[]> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    return scanImageToNodes(base64, context);
  } catch (error) {
    console.error('[VisionScanner] Failed to fetch image:', error);
    return [];
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
