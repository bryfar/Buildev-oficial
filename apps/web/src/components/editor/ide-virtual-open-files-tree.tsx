import { cn } from '@/lib/utils';

export type VirtualPathTreeNode = {
  segment: string;
  /** Full virtual path when this node is a file leaf */
  fullPath?: string;
  children: VirtualPathTreeNode[];
};

function insertPath(root: VirtualPathTreeNode[], segments: string[], fullPath: string): void {
  if (segments.length === 0) return;
  const [head, ...rest] = segments;
  let node = root.find((n) => n.segment === head);
  if (!node) {
    node = { segment: head, children: [] };
    root.push(node);
  }
  if (rest.length === 0) {
    node.fullPath = fullPath;
    return;
  }
  insertPath(node.children, rest, fullPath);
}

function sortTree(nodes: VirtualPathTreeNode[]): void {
  nodes.sort((a, b) => {
    const aDir = a.children.length > 0;
    const bDir = b.children.length > 0;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.segment.localeCompare(b.segment);
  });
  for (const n of nodes) {
    if (n.children.length) sortTree(n.children);
  }
}

export function buildVirtualPathTree(paths: string[]): VirtualPathTreeNode[] {
  const root: VirtualPathTreeNode[] = [];
  const normalized = [...new Set(paths.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  for (const p of normalized) {
    const segments = p.split('/').filter(Boolean);
    insertPath(root, segments, p);
  }
  sortTree(root);
  return root;
}

type Props = {
  tree: VirtualPathTreeNode[];
  primaryPath: string;
  selectedFramePath: string;
  depth?: number;
  onSelectPath: (path: string) => void;
};

export function IdeVirtualFrameFileTree({
  tree,
  primaryPath,
  selectedFramePath,
  depth = 0,
  onSelectPath,
}: Props) {
  return (
    <ul
      className={cn('m-0 list-none p-0', depth > 0 && 'mt-0.5 border-l border-border/60 pl-1.5')}
      role="group"
    >
      {tree.map((node, idx) => {
        const isLeaf = Boolean(node.fullPath);
        const path = node.fullPath ?? '';
        const isPrimary = path === primaryPath;

        if (isLeaf) {
          return (
            <li key={path} className="min-w-0">
              <button
                type="button"
                role="treeitem"
                aria-selected={selectedFramePath === path}
                title={path}
                className={cn(
                  'w-full truncate rounded px-1.5 py-0.5 text-left font-mono text-[10px] hover:bg-accent/60',
                  selectedFramePath === path ? 'bg-accent/80 text-foreground' : 'text-muted-foreground',
                )}
                onClick={() => onSelectPath(path)}
              >
                {node.segment}
                {isPrimary ? (
                  <span className="ml-1 text-[9px] font-sans font-normal text-muted-foreground/80">
                    *
                  </span>
                ) : null}
              </button>
            </li>
          );
        }

        return (
          <li key={`${depth}:${idx}:${node.segment}`} className="min-w-0">
            <div className="mb-0.5 truncate px-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/90">
              {node.segment}
            </div>
            {node.children.length > 0 ? (
              <IdeVirtualFrameFileTree
                tree={node.children}
                primaryPath={primaryPath}
                selectedFramePath={selectedFramePath}
                depth={depth + 1}
                onSelectPath={onSelectPath}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
