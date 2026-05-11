import type { PenDocument, PenNode } from '@/types/pen';

/**
 * HTML document for the active page — shell matches Buildev theme tokens
 * (same oklch palette as apps/web `styles.css`) plus a compact top bar.
 */
export type BuildPreviewHtmlOptions = {
  /** When false, omit the in-document top bar (host page provides chrome). */
  includeAppTopBar?: boolean;
};

export function buildActivePagePreviewHtml(
  document: PenDocument | null | undefined,
  activePageId: string | null,
  options?: BuildPreviewHtmlOptions,
): string {
  const includeAppTopBar = options?.includeAppTopBar !== false;

  if (!document) {
    return wrapPreviewShell(emptyStateInner(), 'Buildev', includeAppTopBar);
  }

  const activePage =
    document.pages?.find((p) => p.id === activePageId) ?? document.pages?.[0];

  if (!activePage) {
    return wrapPreviewShell(emptyStateInner(), 'Buildev', includeAppTopBar);
  }

  const pageTitle = escapeHtml(activePage.name?.trim() || 'Page');
  const nodes = activePage.children || [];
  const elements = nodes.map((n) => nodeToHtml(n as unknown as Record<string, unknown>)).join('\n');
  const inner = `
    <div class="op-canvas">
      <div class="op-canvas-inner">
        ${elements || '<p class="op-muted">No elements to display</p>'}
      </div>
    </div>`;
  return wrapPreviewShell(inner, pageTitle, includeAppTopBar);
}

/** Shared CSS: mirrors `:root` / `:root.light` from Buildev `styles.css`. */
const PREVIEW_APP_SHELL_CSS = `
:root {
  --radius: 0.5rem;
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.178 0 0);
  --card-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.321 0 0);
  --primary: oklch(0.623 0.214 259);
  --primary-foreground: oklch(0.985 0 0);
  --canvas: oklch(0.985 0 0);
}
@media (prefers-color-scheme: light) {
  :root {
    --background: oklch(0.985 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --muted: oklch(0.94 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --border: oklch(0.87 0 0);
    --primary: oklch(0.623 0.214 259);
    --primary-foreground: oklch(0.985 0 0);
    --canvas: oklch(1 0 0);
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.op-topbar {
  flex-shrink: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--card);
  color: var(--card-foreground);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}
.op-topbar-left { display: flex; align-items: center; gap: 6px; min-width: 0; }
.op-brand { font-weight: 600; letter-spacing: -0.02em; }
.op-sep { color: var(--muted-foreground); user-select: none; }
.op-page { color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 50vw; }
.op-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary-foreground);
  background: var(--primary);
  padding: 3px 8px;
  border-radius: calc(var(--radius) - 2px);
}
.op-main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 20px 16px 28px;
}
.op-canvas {
  width: 100%;
  max-width: 1200px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px oklch(0 0 0 / 0.12);
  overflow: hidden;
}
.op-canvas-inner {
  background: var(--canvas);
  color: oklch(0.145 0 0);
  padding: 24px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.op-frame { position: relative; }
.op-canvas-inner img { max-width: 100%; height: auto; vertical-align: middle; }
.op-muted { color: var(--muted-foreground); font-size: 13px; }
.op-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  min-height: 200px;
}
.op-empty-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: var(--foreground); }
.op-empty-desc { font-size: 13px; color: var(--muted-foreground); max-width: 320px; line-height: 1.45; }
.op-embed-body { display: flex; flex-direction: column; min-height: 100%; background: var(--canvas); }
.op-embed-body .op-main-embed {
  flex: 1;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
`;

function emptyStateInner(): string {
  return `
    <div class="op-empty">
      <h2 class="op-empty-title">No content to preview</h2>
      <p class="op-empty-desc">Add elements on the canvas in Buildev, then open preview again.</p>
    </div>`;
}

function wrapPreviewShell(innerBody: string, pageTitleEscaped: string, includeAppTopBar: boolean): string {
  const header = includeAppTopBar
    ? `  <header class="op-topbar">
    <div class="op-topbar-left">
      <span class="op-brand">Buildev</span>
      <span class="op-sep">·</span>
      <span class="op-page">${pageTitleEscaped}</span>
    </div>
    <span class="op-badge">Preview</span>
  </header>
`
    : '';
  const bodyClass = includeAppTopBar ? '' : ' class="op-embed-body"';
  const mainClass = includeAppTopBar ? 'op-main' : 'op-main op-main-embed';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <title>Buildev · Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${PREVIEW_APP_SHELL_CSS}</style>
</head>
<body${bodyClass}>
${header}  <main class="${mainClass}">${innerBody}</main>
</body>
</html>`;
}

function firstFillColor(fill: unknown): string | null {
  if (!Array.isArray(fill) || !fill[0]) return null;
  const f = fill[0] as { type?: string; color?: string };
  if (typeof f.color === 'string') return f.color;
  if (f.type === 'solid' && typeof (f as { color?: string }).color === 'string') {
    return (f as { color: string }).color;
  }
  return null;
}

function strokeLegacyColor(stroke: unknown): { color: string; width: number } | null {
  if (Array.isArray(stroke) && stroke[0]) {
    const s = stroke[0] as { color?: string; width?: number };
    if (typeof s.color === 'string') return { color: s.color, width: typeof s.width === 'number' ? s.width : 1 };
  }
  if (stroke && typeof stroke === 'object' && 'fill' in (stroke as object)) {
    const pen = stroke as { thickness?: number | number[]; fill?: { type?: string; color?: string }[] };
    const th = pen.thickness;
    const w = Array.isArray(th) ? th[0] : typeof th === 'number' ? th : 1;
    const c = firstFillColor(pen.fill);
    if (c) return { color: c, width: w };
  }
  return null;
}

function num(n: unknown, fallback: number): number {
  return typeof n === 'number' && !Number.isNaN(n) ? n : fallback;
}

function textContent(node: Record<string, unknown>): string {
  const c = node.content;
  if (typeof c === 'string') return escapeHtml(c);
  if (Array.isArray(c)) {
    return c
      .map((seg) => {
        if (typeof seg === 'string') return escapeHtml(seg);
        if (seg && typeof seg === 'object' && 'text' in seg && typeof (seg as { text: string }).text === 'string') {
          return escapeHtml((seg as { text: string }).text);
        }
        return '';
      })
      .join('');
  }
  const props = node.props as { text?: string } | undefined;
  if (props?.text) return escapeHtml(String(props.text));
  return 'Text';
}

export function buildPreviewIframeFallbackHtml(message: string): string {
  const safe = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <title>Buildev · Preview</title>
  <style>
    :root {
      --p-fg: oklch(0.2 0 0);
      --p-bg: oklch(0.98 0 0);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --p-fg: oklch(0.92 0 0);
        --p-bg: oklch(0.22 0 0);
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      font-family: Inter, system-ui, sans-serif;
      background: var(--p-bg);
      color: var(--p-fg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      line-height: 1.45;
    }
    p { max-width: 360px; }
  </style>
</head>
<body><p>${safe}</p></body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nodeToHtml(node: Record<string, unknown>): string {
  const rawType = String(node.type ?? '').toLowerCase();
  const width = num(node.width, 100);
  const height = num(node.height, 100);
  const fill = node.fill;
  const stroke = node.stroke;
  const cornerRadius = node.cornerRadius;
  const children = node.children as PenNode[] | undefined;
  const props = node.props as Record<string, unknown> | undefined;

  const style = buildInlineStyle({ fill, stroke, cornerRadius, width, height });
  const childrenHtml = children?.map((c) => nodeToHtml(c as unknown as Record<string, unknown>)).join('') || '';

  if (rawType === 'text') {
    const fontSize = num(props?.fontSize ?? node.fontSize, 16);
    const fontWeight = props?.fontWeight ?? node.fontWeight ?? 400;
    const textAlign = (props?.textAlign ?? node.textAlign ?? 'left') as string;
    const color = firstFillColor(fill) ?? '#000000';
    return `<p style="font-size:${fontSize}px;font-weight:${fontWeight};text-align:${textAlign};color:${escapeHtml(color)};max-width:${width}px">${textContent(node)}</p>`;
  }

  if (rawType === 'rectangle') {
    const imageUrl = (props?.imageUrl ?? props?.src) as string | undefined;
    if (imageUrl) {
      const alt = escapeHtml(String(props?.alt ?? ''));
      return `<img src="${escapeHtml(imageUrl)}" alt="${alt}" style="width:${width}px;height:${height}px;${style}" />`;
    }
    return `<div style="${style}width:${width}px;height:${height}px"></div>`;
  }

  if (rawType === 'ellipse') {
    return `<div style="${style}width:${width}px;height:${height}px;border-radius:50%"></div>`;
  }

  if (rawType === 'frame' || rawType === 'group') {
    return `<div class="op-frame" style="${style}width:${width}px;min-height:${height}px">${childrenHtml}</div>`;
  }

  if (rawType === 'line') {
    const leg = strokeLegacyColor(stroke);
    const strokeColor = leg?.color ?? '#000000';
    const strokeWidth = leg?.width ?? 1;
    return `<div style="width:${width}px;height:${strokeWidth}px;background:${escapeHtml(strokeColor)}"></div>`;
  }

  if (rawType === 'path') {
    const d = typeof node.d === 'string' ? escapeHtml(node.d) : '';
    const fc = firstFillColor(fill) ?? 'none';
    const sc = strokeLegacyColor(stroke);
    const strokeAttr = sc ? ` stroke="${escapeHtml(sc.color)}" stroke-width="${sc.width}"` : '';
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="${escapeHtml(String(fc))}"${strokeAttr}/></svg>`;
  }

  if (rawType === 'image') {
    const src = typeof node.src === 'string' ? escapeHtml(node.src) : '';
    return `<img src="${src}" alt="" style="width:${width}px;height:${height}px;object-fit:contain;${style}" />`;
  }

  if (rawType === 'icon_font') {
    return `<div style="${style}width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;font-size:${Math.min(width, height) * 0.5}px">◇</div>`;
  }

  if (rawType === 'ref') {
    return `<div class="op-frame" style="${style}width:${width}px;min-height:${height}px">${childrenHtml}</div>`;
  }

  // Legacy uppercase (import / older files)
  const u = String(node.type ?? '').toUpperCase();
  if (u === 'TEXT') {
    return nodeToHtml({ ...node, type: 'text' });
  }
  if (u === 'RECT') {
    return nodeToHtml({ ...node, type: 'rectangle' });
  }
  if (u === 'FRAME') {
    return nodeToHtml({ ...node, type: 'frame' });
  }
  if (u === 'ELLIPSE') {
    return nodeToHtml({ ...node, type: 'ellipse' });
  }
  if (u === 'LINE') {
    return nodeToHtml({ ...node, type: 'line' });
  }
  if (u === 'VECTOR') {
    const svgPath = typeof props?.svgPath === 'string' ? escapeHtml(props.svgPath as string) : '';
    const fc = firstFillColor(fill) ?? 'none';
    const sc = strokeLegacyColor(stroke);
    const strokeAttr = sc ? ` stroke="${escapeHtml(sc.color)}" stroke-width="${sc.width}"` : '';
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${svgPath}" fill="${escapeHtml(String(fc))}"${strokeAttr}/></svg>`;
  }

  return `<div style="${style}width:${width}px;height:${height}px">${childrenHtml}</div>`;
}

function buildInlineStyle(node: {
  fill?: unknown;
  stroke?: unknown;
  cornerRadius?: unknown;
  width?: unknown;
  height?: unknown;
}): string {
  const styles: string[] = [];
  const bg = firstFillColor(node.fill);
  if (bg) styles.push(`background:${bg}`);

  const leg = strokeLegacyColor(node.stroke);
  if (leg) styles.push(`border:${leg.width}px solid ${leg.color}`);

  const r = node.cornerRadius;
  if (typeof r === 'number') {
    styles.push(`border-radius:${r}px`);
  } else if (r && typeof r === 'object') {
    const o = r as { topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number };
    styles.push(
      `border-radius:${o.topLeft || 0}px ${o.topRight || 0}px ${o.bottomRight || 0}px ${o.bottomLeft || 0}px`,
    );
  }

  return styles.join(';');
}
