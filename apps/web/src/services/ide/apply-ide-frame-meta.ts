/**
 * Channel A (subset): parse `@buildev-frame-meta` from virtual source and
 * return width/height for patching the frame node. React `.tsx` MVP.
 */
/** First `// @buildev-frame-meta` or legacy `// @openpencil-frame-meta` line in the file. */
const META_RE = /\/\/\s*@(?:buildev|openpencil)-frame-meta\s+(\{[\s\S]*?\})/;

export type FrameMetaParseFailureKind = 'missing' | 'invalid';

export type FrameMetaParseResult =
  | {
      ok: true;
      width: number;
      height: number;
      bg?: string;
      x?: number;
      y?: number;
      opacity?: number;
      cornerRadius?: number;
    }
  | { ok: false; message: string; kind: FrameMetaParseFailureKind };

function isHexColor(s: unknown): s is string {
  return typeof s === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s);
}

function optionalFiniteNumber(rec: Record<string, unknown>, key: string): number | undefined {
  const value = rec[key];
  if (value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error(`Frame meta "${key}" must be a finite number when present.`);
}

export function parseBuildevFrameMeta(source: string): FrameMetaParseResult {
  const m = source.match(META_RE);
  if (!m?.[1]) {
    return {
      ok: false,
      kind: 'missing',
      message: 'Missing // @buildev-frame-meta (or legacy // @openpencil-frame-meta) line (channel A subset).',
    };
  }
  try {
    const data = JSON.parse(m[1]) as unknown;
    if (!data || typeof data !== 'object') {
      return { ok: false, kind: 'invalid', message: 'Frame meta is not a JSON object.' };
    }
    const rec = data as Record<string, unknown>;
    const width = rec.width;
    const height = rec.height;
    if (typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height)) {
      return { ok: false, kind: 'invalid', message: 'Frame meta must include numeric width and height.' };
    }
    if (width < 1 || width > 16000 || height < 1 || height > 16000) {
      return { ok: false, kind: 'invalid', message: 'Width and height must be between 1 and 16000.' };
    }
    let bg: string | undefined;
    if (rec.bg !== undefined) {
      if (!isHexColor(rec.bg)) {
        return {
          ok: false,
          kind: 'invalid',
          message: 'Frame meta "bg" must be a #RRGGBB hex string when present.',
        };
      }
      bg = rec.bg;
    }
    let x: number | undefined;
    let y: number | undefined;
    let opacity: number | undefined;
    let cornerRadius: number | undefined;
    try {
      x = optionalFiniteNumber(rec, 'x');
      y = optionalFiniteNumber(rec, 'y');
      opacity = optionalFiniteNumber(rec, 'opacity');
      cornerRadius = optionalFiniteNumber(rec, 'cornerRadius');
    } catch (e) {
      return {
        ok: false,
        kind: 'invalid',
        message: e instanceof Error ? e.message : 'Invalid numeric field in frame meta.',
      };
    }
    if (opacity !== undefined && (opacity < 0 || opacity > 1)) {
      return { ok: false, kind: 'invalid', message: 'Frame meta "opacity" must be between 0 and 1.' };
    }
    if (cornerRadius !== undefined && cornerRadius < 0) {
      return {
        ok: false,
        kind: 'invalid',
        message: 'Frame meta "cornerRadius" must be greater than or equal to 0.',
      };
    }
    return {
      ok: true,
      width,
      height,
      ...(bg !== undefined ? { bg } : {}),
      ...(x !== undefined ? { x } : {}),
      ...(y !== undefined ? { y } : {}),
      ...(opacity !== undefined ? { opacity } : {}),
      ...(cornerRadius !== undefined ? { cornerRadius } : {}),
    };
  } catch {
    return { ok: false, kind: 'invalid', message: 'Invalid JSON in @buildev-frame-meta / @openpencil-frame-meta.' };
  }
}
