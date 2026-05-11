import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Check, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { DashboardShell } from '@/components/project-flow/dashboard-shell';
import { useDashboardNavSections } from '@/components/project-flow/dashboard-nav-sections';
import { LocalProjectGrid, type LocalProjectGridItem } from '@/components/project-flow/local-project-grid';
import { buildCmsProjectList, useDashboardCmsSidebar } from '@/components/project-flow/dashboard-cms-sidebar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useWorkspaceRegistryStore } from '@/stores/workspace-registry-store';
import { useDocumentStore } from '@/stores/document-store';
import { getRecentFiles, relativeTime, type RecentFile } from '@/utils/recent-files';
import { tryOpenRecentProjectFile } from '@/utils/open-recent-project';
import { isElectron } from '@/utils/file-operations';
import { cn } from '@/lib/utils';

const SESSION_PROJECT_VALUE = '__session__';

function normalizePathForId(path: string): string {
  return path.replace(/\\/g, '/');
}

function recentProjectId(r: RecentFile): string {
  if (r.filePath) return `path:${normalizePathForId(r.filePath)}`;
  return `name:${r.fileName}`;
}

type SortableDraftRow = {
  item: LocalProjectGridItem;
  lastOpened: number;
  sortTitle: string;
};

export function DraftsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const navSections = useDashboardNavSections();
  const assignmentByProject = useWorkspaceRegistryStore((s) => s.assignmentByProject);

  const projectMeta = useDocumentStore((s) => s.document.projectMeta);
  const fileName = useDocumentStore((s) => s.fileName);
  const filePath = useDocumentStore((s) => s.filePath);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const workspaceLabel = projectMeta?.projectName ?? fileName ?? null;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'alphabetical' | 'dateCreated' | 'lastViewed'>('lastViewed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const normalizedFilePath = filePath ? normalizePathForId(filePath) : null;
  const sessionCardVisible = Boolean(projectMeta || fileName || isDirty);
  const sessionId = sessionCardVisible
    ? normalizedFilePath
      ? `path:${normalizedFilePath}`
      : SESSION_PROJECT_VALUE
    : null;

  const formatRelative = useCallback(
    (ts: number) => {
      const { key, params } = relativeTime(ts);
      return i18n.t(key, params);
    },
    [i18n],
  );

  const draftRecentRows = useMemo(() => {
    const byId = new Map<string, RecentFile>();
    for (const r of getRecentFiles()) {
      const id = recentProjectId(r);
      if (assignmentByProject[id]) continue;
      const prev = byId.get(id);
      if (!prev || r.lastOpened > prev.lastOpened) byId.set(id, r);
    }
    return [...byId.values()];
  }, [assignmentByProject]);

  const cmsProjectList = useMemo(
    () => buildCmsProjectList(draftRecentRows, sessionId, projectMeta, fileName, t, recentProjectId),
    [draftRecentRows, sessionId, projectMeta, fileName, t],
  );
  const { navFooterSlot, cmsAside } = useDashboardCmsSidebar(cmsProjectList);

  const sortFieldTriggerLabel = useMemo(() => {
    if (sortField === 'alphabetical') return t('projectFlow.toolbar.sortAlphabetical', { defaultValue: 'Alphabetical' });
    if (sortField === 'dateCreated') return t('projectFlow.toolbar.sortDateCreated', { defaultValue: 'Date created' });
    return t('projectFlow.toolbar.sortLastViewed', { defaultValue: 'Last viewed' });
  }, [sortField, t]);

  const q = searchQuery.trim().toLowerCase();

  const sortedRows = useMemo((): SortableDraftRow[] => {
    const rows: SortableDraftRow[] = [];
    const idsFromDraft = new Set(draftRecentRows.map(recentProjectId));
    for (const r of draftRecentRows) {
      const id = recentProjectId(r);
      const canOpen = Boolean(r.filePath && isElectron());
      rows.push({
        lastOpened: r.lastOpened,
        sortTitle: r.fileName,
        item: {
          id,
          title: r.fileName,
          subtitle: formatRelative(r.lastOpened),
          canOpen,
          onOpen: async () => {
            const ok = await tryOpenRecentProjectFile(r);
            if (ok) void navigate({ to: '/editor' });
          },
        },
      });
    }

    if (sessionCardVisible && sessionId && !assignmentByProject[sessionId] && !idsFromDraft.has(sessionId)) {
      const title = projectMeta?.projectName ?? fileName ?? t('common.untitled');
      const canOpenSession = !normalizedFilePath ? true : Boolean(isElectron());
      rows.push({
        lastOpened: Date.now(),
        sortTitle: title,
        item: {
          id: sessionId,
          title,
          subtitle: t('projectFlow.drafts.sessionSubtitle'),
          canOpen: canOpenSession,
          onOpen: async () => {
            if (normalizedFilePath && isElectron() && filePath) {
              const ok = await tryOpenRecentProjectFile({
                fileName: fileName ?? 'untitled.op',
                filePath,
                lastOpened: Date.now(),
              });
              if (ok) void navigate({ to: '/editor' });
              return;
            }
            void navigate({ to: '/editor' });
          },
        },
      });
    }

    const mult = sortOrder === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (sortField === 'alphabetical') {
        return mult * a.sortTitle.localeCompare(b.sortTitle, undefined, { sensitivity: 'base' });
      }
      return mult * (a.lastOpened - b.lastOpened);
    });

    return rows;
  }, [
    draftRecentRows,
    sessionCardVisible,
    sessionId,
    assignmentByProject,
    projectMeta,
    fileName,
    normalizedFilePath,
    filePath,
    formatRelative,
    navigate,
    sortField,
    sortOrder,
    t,
  ]);

  const gridItems: LocalProjectGridItem[] = useMemo(() => {
    const filtered = q
      ? sortedRows.filter((r) => r.sortTitle.toLowerCase().includes(q) || r.item.title.toLowerCase().includes(q))
      : sortedRows;
    return filtered.map((r) => r.item);
  }, [sortedRows, q]);

  const filterOrSearchActive = q.length > 0;
  const showBlankSlateState = gridItems.length === 0 && !filterOrSearchActive;
  const showFilterEmptyState = filterOrSearchActive && gridItems.length === 0;

  return (
    <DashboardShell
      navSections={navSections}
      navFooterSlot={navFooterSlot}
      workspaceLabel={workspaceLabel}
      workspaceActive={Boolean(projectMeta || fileName)}
      sidebarSearchQuery={searchQuery}
      onSidebarSearchChange={setSearchQuery}
    >
      <div className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2.5 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/logo-buildev.svg"
              alt=""
              className="h-6 max-w-[140px] shrink-0 object-contain object-left"
              width={140}
              height={24}
            />
            <span className="sr-only">Buildev</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
            <header className="shrink-0 flex flex-col gap-[18px]">
              <div className="flex w-full items-center justify-between gap-4">
                <nav
                  className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
                  aria-label={t('projectFlow.shell.breadcrumbAria')}
                >
                  <span className="font-medium text-foreground">{t('projectFlow.shell.navDrafts')}</span>
                </nav>
              </div>
              <div className="flex w-full max-w-full flex-wrap items-stretch justify-end gap-1.5">
                <Select value="all" disabled>
                  <SelectTrigger className="h-7 w-[min(100%,12rem)] border-border bg-background text-xs shadow-sm">
                    <SelectValue>{t('projectFlow.drafts.scopeAll')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('projectFlow.drafts.scopeAll')}</SelectItem>
                  </SelectContent>
                </Select>
                <Popover open={sortMenuOpen} onOpenChange={setSortMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 border-border bg-background px-2 text-xs font-normal shadow-sm"
                      aria-label={t('projectFlow.toolbar.sortMenuAria')}
                    >
                      <span className="max-w-[9rem] truncate">{sortFieldTriggerLabel}</span>
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={6} arrow={false} className="w-[11.9rem] p-0">
                    <div className="py-2">
                      <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('projectFlow.toolbar.sortBy')}
                      </div>
                      <div className="px-1">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setSortField('alphabetical')}
                        >
                          <span className="flex w-4 shrink-0 justify-center">
                            {sortField === 'alphabetical' ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
                          </span>
                          {t('projectFlow.toolbar.sortAlphabetical')}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setSortField('dateCreated')}
                        >
                          <span className="flex w-4 shrink-0 justify-center">
                            {sortField === 'dateCreated' ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
                          </span>
                          {t('projectFlow.toolbar.sortDateCreated')}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setSortField('lastViewed')}
                        >
                          <span className="flex w-4 shrink-0 justify-center">
                            {sortField === 'lastViewed' ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
                          </span>
                          {t('projectFlow.toolbar.sortLastViewed')}
                        </button>
                      </div>
                      <Separator className="my-1" />
                      <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('projectFlow.toolbar.order')}
                      </div>
                      <div className="px-1">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setSortOrder('asc')}
                        >
                          <span className="flex w-4 shrink-0 justify-center">
                            {sortOrder === 'asc' ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
                          </span>
                          {t('projectFlow.toolbar.oldestFirst')}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setSortOrder('desc')}
                        >
                          <span className="flex w-4 shrink-0 justify-center">
                            {sortOrder === 'desc' ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
                          </span>
                          {t('projectFlow.toolbar.newestFirst')}
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div
                  className="inline-flex h-full min-h-7 items-center gap-px rounded-md border border-input bg-secondary p-px shadow-sm"
                  role="group"
                  aria-label={t('projectFlow.toolbar.viewMode')}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'inline-flex h-full w-6 items-center justify-center rounded-[3px] text-muted-foreground transition-colors',
                      viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                    )}
                    aria-pressed={viewMode === 'grid'}
                    title={t('projectFlow.toolbar.gridView')}
                  >
                    <LayoutGrid size={12} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'inline-flex h-full w-6 items-center justify-center rounded-[3px] text-muted-foreground transition-colors',
                      viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                    )}
                    aria-pressed={viewMode === 'list'}
                    title={t('projectFlow.toolbar.listView')}
                  >
                    <List size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </header>

            {showFilterEmptyState || showBlankSlateState ? (
              <div className="flex min-h-[min(28rem,calc(100dvh-12rem))] flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
                <p className="max-w-md text-sm text-muted-foreground">
                  {showFilterEmptyState ? t('projectFlow.dashboard.emptyGrid') : t('projectFlow.drafts.empty')}
                </p>
              </div>
            ) : (
              <div className="mt-8 mb-6">
                <LocalProjectGrid
                  items={gridItems}
                  viewMode={viewMode}
                  emptyMessage={t('projectFlow.drafts.empty')}
                />
              </div>
            )}
          </div>
          {cmsAside}
        </div>
      </div>
    </DashboardShell>
  );
}
