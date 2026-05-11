import { describe, it, expect } from 'vitest';
import { parseBuildevFrameMeta } from '../apply-ide-frame-meta';

describe('apply-ide-frame-meta', () => {
  it('parses valid meta from react-style source', () => {
    const src = `// @buildev-frame-meta {"frameId":"root-frame","width":900,"height":600}
export default function X() { return null; }
`;
    const r = parseBuildevFrameMeta(src);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.width).toBe(900);
      expect(r.height).toBe(600);
    }
  });

  it('parses legacy @openpencil-frame-meta line', () => {
    const src = `// @openpencil-frame-meta {"frameId":"root-frame","width":400,"height":300}
export default function X() { return null; }
`;
    const r = parseBuildevFrameMeta(src);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.width).toBe(400);
      expect(r.height).toBe(300);
    }
  });

  it('returns missing kind when meta line is absent', () => {
    const r = parseBuildevFrameMeta('export const a = 1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('missing');
  });

  it('rejects out-of-range dimensions', () => {
    const src = `// @buildev-frame-meta {"frameId":"x","width":200000,"height":10}`;
    const r = parseBuildevFrameMeta(src);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('invalid');
  });

  it('parses optional bg when valid hex', () => {
    const src = `// @buildev-frame-meta {"frameId":"x","width":100,"height":100,"bg":"#aabbcc"}
export default function X() { return null; }
`;
    const r = parseBuildevFrameMeta(src);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bg).toBe('#aabbcc');
  });

  it('rejects invalid bg', () => {
    const src = `// @buildev-frame-meta {"frameId":"x","width":100,"height":100,"bg":"red"}`;
    const r = parseBuildevFrameMeta(src);
    expect(r.ok).toBe(false);
  });

  it('parses optional numeric fields when present', () => {
    const src = `// @buildev-frame-meta {"frameId":"x","width":100,"height":100,"x":24,"y":48,"opacity":0.6,"cornerRadius":12}`;
    const r = parseBuildevFrameMeta(src);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.x).toBe(24);
      expect(r.y).toBe(48);
      expect(r.opacity).toBe(0.6);
      expect(r.cornerRadius).toBe(12);
    }
  });

  it('rejects invalid optional numeric fields', () => {
    const src = `// @buildev-frame-meta {"frameId":"x","width":100,"height":100,"opacity":3}`;
    const r = parseBuildevFrameMeta(src);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('invalid');
  });
});
