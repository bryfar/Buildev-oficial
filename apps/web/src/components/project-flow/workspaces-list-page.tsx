import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Check, ChevronDown, LayoutGrid, List, Plus } from 'lucide-react';
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
import { getRecentFiles, type RecentFile } from '@/utils/recent-files';
import { cn } from '@/lib/utils';

function normalizePathForId(path: string): string {
  return path.replace(/\\/g, '/');
}

function recentProjectId(r: RecentFile): string {
  if (r.filePath) return `path:${normalizePathForId(r.filePath)}`;
  return `name:${r.fileName}`;
}

function maxLastOpenedInWorkspace(
  wsId: string,
  recentRows: RecentFile[],
  assignment: Record<string, string>,
): number {
  let m = 0;
  for (const r of recentRows) {
    const id = recentProjectId(r);
    if (assignment[id] === wsId) m = Math.max(m, r.lastOpened);
  }
  return m;
}

const SESSION_PROJECT_VALUE = '__session__';

export function WorkspacesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navSections = useDashboardNavSections();
  const workspaces = useWorkspaceRegistryStore((s) => s.workspaces);
  const createWorkspace = useWorkspaceRegistryStore((s) => s.createWorkspace);
  const assignmentByProject = useWorkspaceRegistryStore((s) => s.assignmentByProject);

  const projectMeta = useDocumentStore((s) => s.document.projectMeta);
  const fileName = useDocumentStore((s) => s.fileName);
  const filePath = useDocumentStore((s) => s.filePath);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const workspaceLabel = projectMeta?.projectName ?? fileName ?? null;

  const [searchQuery, setSearchQuery] = useState('');
  const [createOpenMobile, setCreateOpenMobile] = useState(false);
  const [createOpenDesktop, setCreateOpenDesktop] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [sortField, setSortField] = useState<'alphabetical' | 'dateCreated' | 'lastViewed'>('lastViewed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const counts = useMemo(() => {
    const byWs = new Map<string, number>();
    for (const wid of Object.values(assignmentByProject)) {
      byWs.set(wid, (byWs.get(wid) ?? 0) + 1);
    }
    return byWs;
  }, [assignmentByProject]);

  const recentRaw = getRecentFiles();
  const recentProjectRows = useMemo(() => {
    const byId = new Map<string, RecentFile>();
    for (const r of recentRaw) {
      const id = recentProjectId(r);
      const prev = byId.get(id);
      if (!prev || r.lastOpened > prev.lastOpened) byId.set(id, r);
    }
    return [...byId.values()];
  }, [recentRaw]);

  const normalizedFilePath = filePath ? normalizePathForId(filePath) : null;
  const sessionCardVisible = Boolean(projectMeta || fileName || isDirty);
  const sessionId = useMemo((): string | null => {
    if (!sessionCardVisible) return null;
    if (normalizedFilePath) return `path:${normalizedFilePath}`;
    return SESSION_PROJECT_VALUE;
  }, [sessionCardVisible, normalizedFilePath]);

  const cmsProjectList = useMemo(
    () => buildCmsProjectList(recentProjectRows, sessionId, projectMeta, fileName, t, recentProjectId),
    [recentProjectRows, sessionId, projectMeta, fileName, t],
  );
  const { navFooterSlot, cmsAside } = useDashboardCmsSidebar(cmsProjectList);

  const sortFieldTriggerLabel = useMemo(() => {
    if (sortField === 'alphabetical')
      return t('projectFlow.toolbar.sortAlphabetical', { defaultValue: 'Alphabetical' });
    if (sortField === 'dateCreated')
      return t('projectFlow.toolbar.sortDateCreated', { defaultValue: 'Date created' });
    return t('projectFlow.toolbar.sortLastViewed', { defaultValue: 'Last viewed' });
  }, [sortField, t]);

  const sortedWorkspaces = useMemo(() => {
    const mult = sortOrder === 'asc' ? 1 : -1;
    const rows = workspaces.map((ws) => ({
      ws,
      activity: maxLastOpenedInWorkspace(ws.id, recentProjectRows, assignmentByProject),
    }));
    rows.sort((a, b) => {
      if (sortField === 'alphabetical') {
        return mult * a.ws.name.localeCompare(b.ws.name, undefined, { sensitivity: 'base' });
      }
      if (sortField === 'dateCreated') {
        return mult * (a.ws.createdAt - b.ws.createdAt);
      }
      return mult * (a.activity - b.activity);
    });
    return rows.map((r) => r.ws);
  }, [workspaces, sortField, sortOrder, recentProjectRows, assignmentByProject]);

  const q = searchQuery.trim().toLowerCase();

  const gridItems: LocalProjectGridItem[] = useMemo(() => {
    const filtered = q ? sortedWorkspaces.filter((ws) => ws.name.toLowerCase().includes(q)) : sortedWorkspaces;
    return filtered.map((ws) => ({
      id: ws.id,
      title: ws.name,
      subtitle: t('projectFlow.workspaces.projectCount', { count: counts.get(ws.id) ?? 0 }),
      canOpen: true,
      onOpen: () => {
        void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId: ws.id } });
      },
    }));
  }, [sortedWorkspaces, q, counts, navigate, t]);

  const filterOrSearchActive = q.length > 0;
  const showBlankSlateState = workspaces.length === 0 && !filterOrSearchActive;
  const showFilterEmptyState = filterOrSearchActive && gridItems.length === 0;

  const submitCreate = () => {
    const ws = createWorkspace(nameDraft);
    setNameDraft('');
    setCreateOpenMobile(false);
    setCreateOpenDesktop(false);
    void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId: ws.id } });
  };

  const createFormPopover = () => (
    <PopoverContent
      align="end"
      sideOffset={8}
      arrow={false}
      className="w-[min(100vw-1.5rem,16rem)] border-border bg-popover p-3 shadow-lg"
    >
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('projectFlow.workspaces.newNameLabel')}
      </label>
      <input
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        placeholder={t('projectFlow.workspaces.newNamePlaceholder')}
        className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus-visible:ring-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitCreate();
        }}
      />
      <Button type="button" className="mt-3 w-full gap-1.5" onClick={() => submitCreate()}>
        <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
        {t('projectFlow.workspaces.create')}
      </Button>
    </PopoverContent>
  );

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
          <Popover open={createOpenMobile} onOpenChange={setCreateOpenMobile}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 gap-1.5 bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus size={14} strokeWidth={2} />
                <span>{t('projectFlow.createMenu.trigger')}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-90" aria-hidden />
              </Button>
            </PopoverTrigger>
            {createFormPopover()}
          </Popover>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
            <header className="flex shrink-0 flex-col gap-[18px]">
              <div className="flex w-full items-center justify-between gap-4">
                <nav
                  className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
                  aria-label={t('projectFlow.shell.breadcrumbAria')}
                >
                  <span className="font-medium text-foreground">{t('projectFlow.workspaces.title')}</span>
                </nav>
                <Popover open={createOpenDesktop} onOpenChange={setCreateOpenDesktop}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      className="hidden h-9 shrink-0 gap-2 bg-primary px-3 text-primary-foreground shadow-sm hover:bg-primary/90 md:inline-flex"
                    >
                      <Plus size={16} strokeWidth={2} />
                      <span>{t('projectFlow.createMenu.trigger')}</span>
                      <ChevronDown className="h-4 w-4 opacity-90" aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  {createFormPopover()}
                </Popover>
              </div>
              <div className="flex w-full max-w-full flex-wrap items-stretch justify-end gap-1.5">
                <Select value="all" disabled>
                  <SelectTrigger className="h-7 w-[min(100%,12rem)] border-border bg-background text-xs shadow-sm">
                    <SelectValue>{t('projectFlow.workspaces.scopeAll')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('projectFlow.workspaces.scopeAll')}</SelectItem>
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
                  {showFilterEmptyState ? t('projectFlow.dashboard.emptyGrid') : t('projectFlow.workspaces.empty')}
                </p>
              </div>
            ) : (
              <div className="mt-8 mb-6">
                <LocalProjectGrid
                  items={gridItems}
                  viewMode={viewMode}
                  emptyMessage={t('projectFlow.workspaces.empty')}
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
