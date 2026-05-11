/** Helpers for default paths when adding virtual IDE files under a frame. */

export function virtualPathDirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '' : path.slice(0, i);
}

export function virtualPathBasename(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

export function extensionFromVirtualPath(path: string): string {
  const base = virtualPathBasename(path);
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot) : '.tsx';
}

/** Next sibling path under the same folder as `anchorPath`, avoiding `existingPaths`. */
export function suggestNewVirtualPath(anchorPath: string, existingPaths: Iterable<string>): string {
  const dir = virtualPathDirname(anchorPath);
  const ext = extensionFromVirtualPath(anchorPath);
  const existing = new Set(existingPaths);
  let n = 1;
  let candidate: string;
  do {
    candidate = dir ? `${dir}/Untitled-${n}${ext}` : `Untitled-${n}${ext}`;
    n++;
  } while (existing.has(candidate) && n < 10_000);
  return candidate;
}
