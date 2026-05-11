/** Convert a computed CSS color value (oklch/rgb/etc.) to #rrggbb via an offscreen canvas. */
export function cssToHex(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = v;
    const hex = ctx.fillStyle;
    return hex.startsWith('#') ? hex : null;
  } catch {
    return null;
  }
}
