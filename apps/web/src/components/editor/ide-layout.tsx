import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Code2, FilePlus, Files, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LayerPanel from '@/components/panels/layer-panel';
import CodePanel from '@/components/panels/code-panel';
import { useCanvasStore } from '@/stores/canvas-store';
import { useDocumentStore } from '@/stores/document-store';
import { findNodeInTree, getActivePageChildren } from '@/stores/document-tree-utils';
import type { PenNode, ProjectStack } from '@/types/pen';
import {
  buildDeterministicFrameSource,
  frameFillCssColor,
  getEffectiveProjectStack,
} from '@/services/ide/frame-to-code';
import { initialContentForNewVirtualFile } from '@/services/ide/ide-initial-virtual-content';
import { suggestNewVirtualPath } from '@/services/ide/ide-suggest-new-virtual-path';
import { parseBuildevFrameMeta } from '@/services/ide/apply-ide-frame-meta';
import { mergeRegeneratedPrimaryFrameFile } from '@/services/ide/merge-regenerated-frame-files';
import {
  applyAssistedStackMigration,
  buildStackMigrationPreview,
} from '@/services/ide/stack-migration-assistant';
import {
  buildVirtualPathTree,
  IdeVirtualFrameFileTree,
} from '@/components/editor/ide-virtual-open-files-tree';

function languageIdForVirtualPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.vue')) return 'html';
  if (lower.endsWith('.astro')) return 'astro';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.tsx') || lower.endsWith('.ts')) return 'typescript';
  return 'plaintext';
}

function IdeEditorChunkErrorFallback({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-destructive/5 px-4 text-center text-xs text-destructive">
      <span className="font-medium text-foreground">{t('topbar.ideEditorChunkError')}</span>
      <span className="max-w-md break-words text-muted-foreground">{message}</span>
    </div>
  );
}

// Catch narrows the default export for chunk load failures; runtime shape is still a valid React component.
const IdeEditorPane = lazy(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  import('./ide-editor-pane').catch((err: unknown) => {
    console.error('[IdeLayout] Failed to load ide-editor-pane chunk', err);
    const message = err instanceof Error ? err.message : String(err);
    return {
      default: () => <IdeEditorChunkErrorFallback message={message} />,
    };
  }) as any,
);

type IdeBottomPanelTab = 'problems' | 'output' | 'terminal' | 'ports';
type EditorTabId = 'context' | 'frame';

const CHANNEL_A_DEBOUNCE_MS = 480;

function ActivityButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      className={cn(
        'h-11 w-full shrink-0 rounded-none border-l-2 border-transparent text-muted-foreground hover:text-foreground',
        active && 'border-l-primary bg-muted/80 text-foreground',
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function BottomPanelTabButton({
  id,
  active,
  label,
  onClick,
}: {
  id: string;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`ide-bottom-tab-${id}`}
      aria-selected={active}
      className={cn(
        'relative shrink-0 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground',
        active && 'text-foreground after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-primary',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function findFirstFrameInTree(nodes: PenNode[]): string | null {
  for (const n of nodes) {
    if (n.type === 'frame') return n.id;
    if ('children' in n && n.children?.length) {
      const inner = findFirstFrameInTree(n.children);
      if (inner) return inner;
    }
  }
  return null;
}

function resolveTargetFrameId(
  doc: ReturnType<typeof useDocumentStore.getState>['document'],
  activePageId: string | null,
  selectedIds: string[],
  activeId: string | null,
): string | null {
  const children = getActivePageChildren(doc, activePageId);
  const tryId = activeId ?? selectedIds[0] ?? null;
  if (tryId) {
    const node = findNodeInTree(children, tryId);
    if (node?.type === 'frame') return tryId;
  }
  for (const id of selectedIds) {
    const node = findNodeInTree(children, id);
    if (node?.type === 'frame') return id;
  }
  return findFirstFrameInTree(children);
}

export default function IdeLayout() {
  const { t } = useTranslation();
  const layerPanelOpen = useCanvasStore((s) => s.layerPanelOpen);
  const ideActivity = useCanvasStore((s) => s.ideActivity);
  const setIdeActivity = useCanvasStore((s) => s.setIdeActivity);
  const setIdeModeOpen = useCanvasStore((s) => s.setIdeModeOpen);
  const activePageId = useCanvasStore((s) => s.activePageId);
  const selection = useCanvasStore((s) => s.selection);
  const ideDiagnostics = useCanvasStore((s) => s.ideDiagnostics);
  const setIdeDiagnostics = useCanvasStore((s) => s.setIdeDiagnostics);
  const clearIdeDiagnostics = useCanvasStore((s) => s.clearIdeDiagnostics);

  const fileName = useDocumentStore((s) => s.fileName);
  const document = useDocumentStore((s) => s.document);
  const updateNode = useDocumentStore((s) => s.updateNode);
  const upsertIdeFrameFile = useDocumentStore((s) => s.upsertIdeFrameFile);
  const replaceIdeFrameFiles = useDocumentStore((s) => s.replaceIdeFrameFiles);

  const [bottomTab, setBottomTab] = useState<IdeBottomPanelTab>('problems');
  const [editorTab, setEditorTab] = useState<EditorTabId>('frame');
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [migrationStack, setMigrationStack] = useState<ProjectStack>('react');
  const [migrationStep, setMigrationStep] = useState<1 | 2>(1);
  /** When non-null, open this virtual path under the frame tab (primary path if null). */
  const [frameOpenPath, setFrameOpenPath] = useState<string | null>(null);
  const channelATimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCursorChange = useCallback((pos: { line: number; column: number }) => {
    setCursorPos(pos);
  }, []);

  const showLayerStrip = ideActivity === 'explorer' && layerPanelOpen;
  const showCodeStrip = ideActivity === 'code';

  const targetFrameId = useMemo(
    () => resolveTargetFrameId(document, activePageId, selection.selectedIds, selection.activeId),
    [document, activePageId, selection.selectedIds, selection.activeId],
  );

  const pageId = activePageId ?? document.pages?.[0]?.id ?? 'page-1';
  const stack = useMemo(() => getEffectiveProjectStack(document), [document]);
  const migrationPreview = useMemo(
    () => buildStackMigrationPreview(document, pageId, migrationStack),
    [document, pageId, migrationStack],
  );

  const deterministic = useMemo(() => {
    if (!targetFrameId) return null;
    try {
      return buildDeterministicFrameSource(document, pageId, targetFrameId);
    } catch {
      return null;
    }
  }, [document, pageId, targetFrameId]);

  const frameVirtualPath = deterministic?.path ?? '';

  const workspaceFiles = useMemo(() => {
    if (!targetFrameId) return [];
    return document.ideWorkspace?.frames[targetFrameId]?.files ?? [];
  }, [targetFrameId, document.ideWorkspace]);

  const resolvedFramePath = useMemo(() => {
    if (!frameVirtualPath) return '';
    const want = frameOpenPath ?? frameVirtualPath;
    const known = new Set<string>();
    for (const f of workspaceFiles) known.add(f.path);
    known.add(frameVirtualPath);
    if (known.has(want)) return want;
    return frameVirtualPath;
  }, [frameOpenPath, frameVirtualPath, workspaceFiles]);

  const virtualPathsForTree = useMemo(() => {
    const s = new Set<string>();
    for (const f of workspaceFiles) s.add(f.path);
    if (frameVirtualPath) s.add(frameVirtualPath);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [workspaceFiles, frameVirtualPath]);

  const frameTree = useMemo(() => buildVirtualPathTree(virtualPathsForTree), [virtualPathsForTree]);

  const frameEditorValue = useMemo(() => {
    if (!resolvedFramePath) return '';
    const meta = workspaceFiles.find((f) => f.path === resolvedFramePath);
    const stored = meta?.content;
    if (stored !== undefined) return stored;
    if (resolvedFramePath === frameVirtualPath) return deterministic?.content ?? '';
    return '';
  }, [resolvedFramePath, workspaceFiles, frameVirtualPath, deterministic]);

  const frameLanguage = useMemo(() => {
    const meta = workspaceFiles.find((f) => f.path === resolvedFramePath);
    if (meta?.language) return meta.language;
    if (resolvedFramePath === frameVirtualPath) return deterministic?.language ?? 'typescript';
    return languageIdForVirtualPath(resolvedFramePath);
  }, [workspaceFiles, resolvedFramePath, frameVirtualPath, deterministic]);

  const safeName = (fileName ?? 'untitled').replace(/[^\w.-]+/g, '_');
  const contextModelPath = `file:///buildev/${safeName}/document.context.ts`;
  const frameModelPath = useMemo(() => {
    if (!targetFrameId) return `file:///buildev/frames/unknown.tsx`;
    const enc = encodeURIComponent(resolvedFramePath || `frame-${targetFrameId}`);
    return `file:///buildev/${enc}`;
  }, [targetFrameId, resolvedFramePath]);

  const contextEditorValue = useMemo(() => {
    const pages = document.pages ?? [];
    const activePage = pages.find((p) => p.id === activePageId);
    const snapshot = {
      file: fileName ?? 'untitled',
      activePageId,
      activePageName: activePage?.name ?? null,
      pageCount: pages.length,
      rootNodeCount: document.children?.length ?? 0,
    };
    return `/**\n * Buildev — document context (read-only preview)\n */\nexport const documentContext = ${JSON.stringify(snapshot, null, 2)} as const;\n`;
  }, [activePageId, document, fileName]);

  const activeModelPath = editorTab === 'context' ? contextModelPath : frameModelPath;
  const activeEditorValue = editorTab === 'context' ? contextEditorValue : frameEditorValue;
  const activeLanguage = editorTab === 'context' ? 'typescript' : frameLanguage;
  const activeReadOnly = editorTab === 'context' || !targetFrameId;

  const frameDirty = Boolean(
    targetFrameId && document.ideWorkspace?.frames[targetFrameId]?.dirty,
  );

  useEffect(() => {
    setCursorPos({ line: 1, column: 1 });
  }, [activeModelPath]);

  useEffect(() => {
    setFrameOpenPath(null);
  }, [targetFrameId]);

  useEffect(() => {
    return () => {
      if (channelATimerRef.current) clearTimeout(channelATimerRef.current);
    };
  }, []);

  const applyChannelA = useCallback(
    (source: string) => {
      if (!targetFrameId) return;
      const parsed = parseBuildevFrameMeta(source);
      if (!parsed.ok) {
        const severity = parsed.kind === 'missing' ? 'warning' : 'error';
        setIdeDiagnostics([{ id: 'meta', message: parsed.message, severity }]);
        return;
      }
      const node = useDocumentStore.getState().getNodeById(targetFrameId);
      if (!node || node.type !== 'frame') {
        clearIdeDiagnostics();
        return;
      }
      const sameW = node.width === parsed.width;
      const sameH = node.height === parsed.height;
      const curBg = frameFillCssColor(node).toLowerCase();
      const wantBg = parsed.bg?.toLowerCase();
      const sameBg = wantBg === undefined || curBg === wantBg;
      const sameX = parsed.x === undefined || node.x === parsed.x;
      const sameY = parsed.y === undefined || node.y === parsed.y;
      const sameOpacity = parsed.opacity === undefined || node.opacity === parsed.opacity;
      const sameCornerRadius =
        parsed.cornerRadius === undefined || node.cornerRadius === parsed.cornerRadius;
      if (sameW && sameH && sameBg && sameX && sameY && sameOpacity && sameCornerRadius) {
        clearIdeDiagnostics();
        return;
      }
      clearIdeDiagnostics();
      const updates: Partial<PenNode> = {};
      if (!sameW) Object.assign(updates, { width: parsed.width });
      if (!sameH) Object.assign(updates, { height: parsed.height });
      if (wantBg !== undefined && !sameBg) {
        Object.assign(updates, { fill: [{ type: 'solid', color: parsed.bg! }] });
      }
      if (parsed.x !== undefined && !sameX) Object.assign(updates, { x: parsed.x });
      if (parsed.y !== undefined && !sameY) Object.assign(updates, { y: parsed.y });
      if (parsed.opacity !== undefined && !sameOpacity) Object.assign(updates, { opacity: parsed.opacity });
      if (parsed.cornerRadius !== undefined && !sameCornerRadius) {
        Object.assign(updates, { cornerRadius: parsed.cornerRadius });
      }
      updateNode(targetFrameId, updates);
    },
    [targetFrameId, updateNode, setIdeDiagnostics, clearIdeDiagnostics],
  );

  const handleFrameSourceChange = useCallback(
    (value: string) => {
      if (!targetFrameId || !resolvedFramePath) return;
      upsertIdeFrameFile(targetFrameId, resolvedFramePath, value, {
        language: frameLanguage,
        markDirty: true,
      });
      if (resolvedFramePath !== frameVirtualPath) {
        if (channelATimerRef.current) clearTimeout(channelATimerRef.current);
        clearIdeDiagnostics();
        return;
      }
      if (channelATimerRef.current) clearTimeout(channelATimerRef.current);
      channelATimerRef.current = setTimeout(() => applyChannelA(value), CHANNEL_A_DEBOUNCE_MS);
    },
    [
      targetFrameId,
      resolvedFramePath,
      frameVirtualPath,
      frameLanguage,
      upsertIdeFrameFile,
      applyChannelA,
      clearIdeDiagnostics,
    ],
  );

  const handleNewVirtualFile = useCallback(() => {
    if (!targetFrameId || !frameVirtualPath) return;
    const anchor = resolvedFramePath || frameVirtualPath;
    const suggested = suggestNewVirtualPath(anchor, virtualPathsForTree);
    const input = window.prompt(t('topbar.ideNewVirtualFilePrompt'), suggested);
    if (input === null) return;
    const trimmed = input.trim().replace(/^\/+/, '');
    if (!trimmed) return;
    const initial = initialContentForNewVirtualFile(trimmed, stack);
    upsertIdeFrameFile(targetFrameId, trimmed, initial, {
      language: languageIdForVirtualPath(trimmed),
      markDirty: true,
    });
    setEditorTab('frame');
    setFrameOpenPath(trimmed);
  }, [
    targetFrameId,
    frameVirtualPath,
    resolvedFramePath,
    virtualPathsForTree,
    t,
    stack,
    upsertIdeFrameFile,
  ]);

  const handleRegenerate = useCallback(() => {
    if (!targetFrameId || !deterministic) {
      window.alert(t('topbar.ideRegenerateError'));
      return;
    }
    if (frameDirty) {
      const ok = window.confirm(t('topbar.ideRegenerateConfirmDirty'));
      if (!ok) return;
    }
    try {
      const next = buildDeterministicFrameSource(document, pageId, targetFrameId);
      const existing = document.ideWorkspace?.frames[targetFrameId]?.files ?? [];
      const merged = mergeRegeneratedPrimaryFrameFile(existing, {
        path: next.path,
        content: next.content,
        language: next.language,
      }, {
        conflictStrategy: frameDirty ? 'mark_conflict' : 'accept_generated',
      });
      replaceIdeFrameFiles(targetFrameId, merged);
      if (frameDirty) {
        setIdeDiagnostics([
          {
            id: 'regen-conflict',
            severity: 'warning',
            message:
              'Regenerate inserted conflict markers in the primary file because unsaved edits existed.',
          },
        ]);
      } else {
        clearIdeDiagnostics();
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('topbar.ideRegenerateError'));
    }
  }, [
    targetFrameId,
    deterministic,
    frameDirty,
    document,
    pageId,
    replaceIdeFrameFiles,
    setIdeDiagnostics,
    clearIdeDiagnostics,
    t,
  ]);

  const bottomTabs: { id: IdeBottomPanelTab; labelKey: string }[] = [
    { id: 'problems', labelKey: 'topbar.idePanelTabProblems' },
    { id: 'output', labelKey: 'topbar.idePanelTabOutput' },
    { id: 'terminal', labelKey: 'topbar.idePanelTabTerminal' },
    { id: 'ports', labelKey: 'topbar.idePanelTabPorts' },
  ];

  const placeholderCopy: Record<
    IdeBottomPanelTab,
    { titleKey: string; bodyKey: string }
  > = {
    problems: {
      titleKey: 'topbar.idePanelPlaceholderProblemsTitle',
      bodyKey: 'topbar.idePanelPlaceholderProblemsBody',
    },
    output: {
      titleKey: 'topbar.idePanelPlaceholderOutputTitle',
      bodyKey: 'topbar.idePanelPlaceholderOutputBody',
    },
    terminal: {
      titleKey: 'topbar.idePanelPlaceholderTerminalTitle',
      bodyKey: 'topbar.idePanelPlaceholderTerminalBody',
    },
    ports: {
      titleKey: 'topbar.idePanelPlaceholderPortsTitle',
      bodyKey: 'topbar.idePanelPlaceholderPortsBody',
    },
  };

  const applyMigrationStack = useCallback(() => {
    const ok = window.confirm(t('topbar.ideMigrationConfirmClear'));
    if (!ok) return;
    useDocumentStore.setState((s) => {
      if (!s.document.projectMeta) return {};
      const migrated = applyAssistedStackMigration(s.document, pageId, migrationStack);
      return {
        document: migrated,
        isDirty: true,
      };
    });
    setMigrationOpen(false);
    setMigrationStep(1);
    setFrameOpenPath(null);
  }, [migrationStack, pageId, t]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className="flex w-12 shrink-0 flex-col items-stretch border-r border-border bg-muted py-1"
          role="navigation"
          aria-label={t('topbar.ideActivityBarAria')}
        >
          <ActivityButton
            active={ideActivity === 'explorer'}
            label={t('topbar.ideActivityExplorer')}
            onClick={() => setIdeActivity('explorer')}
          >
            <Files className="h-5 w-5" strokeWidth={1.5} />
          </ActivityButton>
          <ActivityButton
            active={ideActivity === 'code'}
            label={t('topbar.ideActivityCode')}
            onClick={() => setIdeActivity('code')}
          >
            <Code2 className="h-5 w-5" strokeWidth={1.5} />
          </ActivityButton>
        </div>

        {showLayerStrip ? <LayerPanel ideExplorerChrome /> : null}

        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(168px,min(32vh,320px))] border-r border-border bg-background">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            {ideActivity === 'explorer' ? (
              <div
                className="shrink-0 border-b border-border bg-muted/30 px-2 py-1.5"
                role="tree"
                aria-label={t('topbar.ideVirtualFilesAria')}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('topbar.ideVirtualFilesSection')}
                  </p>
                  {targetFrameId && frameVirtualPath ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-0.5 px-1.5 text-[10px]"
                      onClick={handleNewVirtualFile}
                      title={t('topbar.ideNewVirtualFileAria')}
                    >
                      <FilePlus className="h-3 w-3" strokeWidth={1.5} />
                      <span className="sr-only sm:not-sr-only">{t('topbar.ideNewVirtualFile')}</span>
                    </Button>
                  ) : null}
                </div>
                <div className="flex min-h-0 min-w-0 flex-col gap-1">
                  <button
                    type="button"
                    role="treeitem"
                    aria-selected={editorTab === 'context'}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 text-left font-mono text-[10px] hover:bg-accent/60',
                      editorTab === 'context' ? 'bg-accent/80 text-foreground' : 'text-muted-foreground',
                    )}
                    onClick={() => {
                      setEditorTab('context');
                      setFrameOpenPath(null);
                    }}
                  >
                    {t('topbar.ideTabContext')}
                  </button>
                  {targetFrameId && frameVirtualPath ? (
                    <div className="max-h-44 min-h-0 overflow-y-auto pr-0.5">
                      <IdeVirtualFrameFileTree
                        tree={frameTree}
                        primaryPath={frameVirtualPath}
                        selectedFramePath={editorTab === 'frame' ? resolvedFramePath : ''}
                        onSelectPath={(path) => {
                          setEditorTab('frame');
                          setFrameOpenPath(path);
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div
              className="flex h-9 shrink-0 items-end justify-between gap-2 border-b border-border bg-muted/80 px-1 pt-1"
              role="tablist"
              aria-label={t('topbar.ideEditorTabsAria')}
            >
              <div className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto">
                <button
                  type="button"
                  role="tab"
                  aria-selected={editorTab === 'context'}
                  className={cn(
                    'inline-flex max-w-[min(12rem,40vw)] shrink-0 items-center rounded-t border border-border border-b-0 px-2 py-1 text-[11px] font-medium',
                    editorTab === 'context' ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground',
                  )}
                  onClick={() => {
                    setEditorTab('context');
                    setFrameOpenPath(null);
                  }}
                >
                  <span className="truncate font-mono">{t('topbar.ideTabContext')}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={editorTab === 'frame'}
                  disabled={!targetFrameId}
                  className={cn(
                    'inline-flex max-w-[min(18rem,50vw)] shrink-0 items-center rounded-t border border-border border-b-0 px-2 py-1 text-[11px] font-medium',
                    editorTab === 'frame' ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground',
                    !targetFrameId && 'cursor-not-allowed opacity-50',
                  )}
                  onClick={() => {
                    if (!targetFrameId) return;
                    setEditorTab('frame');
                    setFrameOpenPath(null);
                  }}
                >
                  <span className="truncate font-mono" title={resolvedFramePath || frameVirtualPath}>
                    {targetFrameId
                      ? (resolvedFramePath || frameVirtualPath).split('/').pop() ?? t('topbar.ideTabFrame')
                      : t('topbar.ideNoFrame')}
                  </span>
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1 pr-1">
                <Popover
                  open={migrationOpen}
                  onOpenChange={(open) => {
                    setMigrationOpen(open);
                    if (!open) setMigrationStep(1);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]">
                      {t('topbar.ideMigrationButton')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="end">
                    <p className="text-xs font-medium">{t('topbar.ideMigrationTitle')}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t('topbar.ideMigrationHint')}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={cn('rounded px-1.5 py-0.5', migrationStep === 1 && 'bg-muted text-foreground')}>
                        {t('topbar.ideMigrationStep1')}
                      </span>
                      <span>{'->'}</span>
                      <span className={cn('rounded px-1.5 py-0.5', migrationStep === 2 && 'bg-muted text-foreground')}>
                        {t('topbar.ideMigrationStep2')}
                      </span>
                    </div>
                    {migrationStep === 1 ? (
                      <>
                        <div className="mt-2">
                          <Select
                            value={migrationStack}
                            onValueChange={(v) => setMigrationStack(v as ProjectStack)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="react">React</SelectItem>
                              <SelectItem value="vue">Vue</SelectItem>
                              <SelectItem value="astro">Astro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" size="sm" className="mt-3 w-full" onClick={() => setMigrationStep(2)}>
                          {t('topbar.ideMigrationContinue')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-[10px] font-medium text-muted-foreground">
                          {t('topbar.ideMigrationPreviewTitle')}
                        </p>
                        <pre
                          className="mt-1 max-h-28 overflow-auto rounded border border-border bg-muted/40 p-2 font-mono text-[10px] leading-snug text-muted-foreground"
                          role="region"
                          aria-label={t('topbar.ideMigrationPreviewAria')}
                        >
                          {JSON.stringify(
                            {
                              currentStack: migrationPreview.currentStack,
                              nextStack: migrationPreview.nextStack,
                              rows: migrationPreview.rows.slice(0, 6),
                            },
                            null,
                            2,
                          )}
                        </pre>
                        <p className="mt-1 text-[10px] text-muted-foreground">{migrationPreview.assistantNote}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {t('topbar.ideMigrationPreviewFoot')}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setMigrationStep(1)}
                          >
                            {t('topbar.ideMigrationBack')}
                          </Button>
                          <Button type="button" size="sm" className="w-full" onClick={applyMigrationStack}>
                            {t('topbar.ideMigrationApply')}
                          </Button>
                        </div>
                      </>
                    )}
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  disabled={!targetFrameId}
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('topbar.ideRegenerateFromDesign')}
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {!targetFrameId && editorTab === 'frame' ? (
                <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  {t('topbar.ideNoFrame')}
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/40 text-xs text-muted-foreground">
                      {t('topbar.ideEditorLoading')}
                    </div>
                  }
                >
                  <IdeEditorPane
                    key={activeModelPath}
                    modelPath={activeModelPath}
                    language={activeLanguage}
                    value={activeEditorValue}
                    readOnly={activeReadOnly}
                    onChange={editorTab === 'frame' ? handleFrameSourceChange : undefined}
                    onCursorPositionChange={handleCursorChange}
                  />
                </Suspense>
              )}
            </div>
          </div>

          <div
            className="flex min-h-0 flex-col border-t border-border bg-muted/20"
            role="region"
            aria-label={t('topbar.ideBottomPanelAria')}
          >
            <div
              className="flex h-9 shrink-0 items-stretch gap-0 overflow-x-auto border-b border-border bg-muted/80 px-1"
              role="tablist"
            >
              {bottomTabs.map((tab) => (
                <BottomPanelTabButton
                  key={tab.id}
                  id={tab.id}
                  active={bottomTab === tab.id}
                  label={t(tab.labelKey)}
                  onClick={() => setBottomTab(tab.id)}
                />
              ))}
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden bg-background" role="tabpanel">
              {bottomTab === 'problems' && ideDiagnostics.length > 0 ? (
                <ul className="max-h-full list-none overflow-auto p-2 text-left text-[11px]">
                  {ideDiagnostics.map((d) => (
                    <li
                      key={d.id}
                      className={cn(
                        'rounded border border-border px-2 py-1.5',
                        d.severity === 'error' ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {d.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-6 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t(placeholderCopy[bottomTab].titleKey)}
                  </p>
                  <p className="max-w-sm text-[11px] text-muted-foreground">
                    {t(placeholderCopy[bottomTab].bodyKey)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showCodeStrip ? (
          <div className="flex w-[min(28rem,40vw)] shrink-0 flex-col border-l border-border bg-card">
            <CodePanel />
          </div>
        ) : null}
      </div>

      <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-muted px-2 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="truncate tabular-nums">{t('topbar.ideStatusLabel')}</span>
          <span className="shrink-0 text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/90">
            {stack}
          </span>
          {resolvedFramePath || frameVirtualPath ? (
            <>
              <span className="shrink-0 text-muted-foreground/50" aria-hidden>
                ·
              </span>
              <span
                className="truncate font-mono text-[10px] text-muted-foreground/90"
                title={resolvedFramePath || frameVirtualPath}
              >
                {resolvedFramePath || frameVirtualPath}
              </span>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-wide">
          <span className="tabular-nums" aria-live="polite">
            {t('topbar.ideStatusLn', { line: cursorPos.line })}
            <span className="mx-1.5 opacity-40" aria-hidden>
              ·
            </span>
            {t('topbar.ideStatusCol', { column: cursorPos.column })}
          </span>
          <span className="hidden sm:inline">{t('topbar.ideStatusLanguageTs')}</span>
          <span className="hidden md:inline">{t('topbar.ideStatusEncoding')}</span>
        </div>
        <button
          type="button"
          className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted-foreground/10"
          onClick={() => setIdeModeOpen(false)}
        >
          {t('topbar.exitIde')}
        </button>
      </footer>
    </div>
  );
}
