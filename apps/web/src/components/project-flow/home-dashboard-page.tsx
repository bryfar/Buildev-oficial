import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Check, ChevronDown, LayoutGrid, List, PenTool, Cloud, Loader2 } from 'lucide-react';
import { useDocumentStore } from '@/stores/document-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { useProjectFlowStore } from '@/stores/project-flow-store';
import { DashboardShell } from '@/components/project-flow/dashboard-shell';
import { useDashboardNavSections } from '@/components/project-flow/dashboard-nav-sections';
import { LocalProjectGrid, type LocalProjectGridItem } from '@/components/project-flow/local-project-grid';
import { NewProjectCreateMenu } from '@/components/project-flow/new-project-create-menu';
import { buildCmsProjectList, useDashboardCmsSidebar } from '@/components/project-flow/dashboard-cms-sidebar';
import { NewProjectWizardDialog, type ArchitectChoice } from '@/components/project-flow/new-project-wizard-dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { confirmUnsavedChanges } from '@/hooks/use-electron-menu';
import { isElectron, openDocument, openDocumentFS, supportsFileSystemAccess } from '@/utils/file-operations';
import { parseAndPrepareImportedDocument } from '@/utils/import-pen-document';
import { getRecentFiles, relativeTime, type RecentFile } from '@/utils/recent-files';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useCloudSitesStore } from '@/stores/cloud-sites-store';
import { useWorkspaceRegistryStore } from '@/stores/workspace-registry-store';
import { tryOpenRecentProjectFile } from '@/utils/open-recent-project';

const SESSION_PROJECT_VALUE = '__session__';

/** Avoids double `createProject` when React Strict Mode remounts with `?new=1` still in the URL. */
let consumedNewProjectQueryParam = false;

function normalizePathForId(path: string): string {
  return path.replace(/\\/g, '/');
}

function recentProjectId(r: RecentFile): string {
  if (r.filePath) return `path:${normalizePathForId(r.filePath)}`;
  return `name:${r.fileName}`;
}

export function HomeDashboardPage() {
  const { t, i18n } = useTranslation();
  const projectMeta = useDocumentStore((s) => s.document.projectMeta);
  const fileName = useDocumentStore((s) => s.fileName);
  const filePath = useDocumentStore((s) => s.filePath);
  const isDirty = useDocumentStore((s) => s.isDirty);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardLaunchPreset, setWizardLaunchPreset] = useState<{
    choice: ArchitectChoice;
    skipArchitectStep: boolean;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'alphabetical' | 'dateCreated' | 'lastViewed'>('lastViewed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { isAuthenticated } = useAuthStore();
  const { sites: cloudSites, fetchSites, isLoading: isLoadingCloud } = useCloudSitesStore();
  const assignmentByProject = useWorkspaceRegistryStore((s) => s.assignmentByProject);
  const navSections = useDashboardNavSections();

  useEffect(() => {
    if (isAuthenticated) {
      fetchSites();
    }
  }, [isAuthenticated, fetchSites]);

  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const locationHash = useRouterState({ select: (s) => s.location.hash });
  useEffect(() => {
    if (locationHash === 'recents' || locationHash === '#recents') {
      void navigate({ to: '/recents', replace: true });
    }
  }, [locationHash, navigate]);

  // `?new=1` bootstrap: run once per home mount. Do not subscribe to `useSearch` here: while
  // navigating to `/editor` the index search param can flicker, which previously reset
  // `consumedNewProjectQueryParam` and re-fired this logic (infinite update loop).
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') {
      consumedNewProjectQueryParam = false;
      return;
    }
    if (consumedNewProjectQueryParam) return;
    consumedNewProjectQueryParam = true;
    useProjectFlowStore.getState().createProject({
      projectName: i18n.t('common.untitled'),
      creationMode: 'normal',
      projectType: 'landing',
      stack: 'react',
      templatePreset: 'landing-hero',
      backendStack: 'static',
    });
    void navigateRef.current({ to: '/editor', replace: true });
  }, []);

  const handleOpenFile = useCallback(async () => {
    if (!(await confirmUnsavedChanges())) return;
    const navigateEditor = () => {
      void navigate({ to: '/editor' });
    };
    if (isElectron()) {
      window.electronAPI!.openFile().then((result) => {
        if (!result) return;
        try {
          const name = result.filePath.split(/[/\\]/).pop() || 'untitled.op';
          const prepared = parseAndPrepareImportedDocument(result.content, {
            fileName: name,
            filePath: result.filePath,
          });
          if (!prepared) return;
          useDocumentStore.getState().loadDocument(prepared.doc, name, null, result.filePath);
          navigateEditor();
        } catch {
          /* invalid file */
        }
      });
      return;
    }
    if (supportsFileSystemAccess()) {
      openDocumentFS().then((result) => {
        if (result) {
          useDocumentStore.getState().loadDocument(result.doc, result.fileName, result.handle);
          navigateEditor();
        }
      });
      return;
    }
    openDocument().then((result) => {
      if (result) {
        useDocumentStore.getState().loadDocument(result.doc, result.fileName);
        navigateEditor();
      }
    });
  }, []);

  const clearWizardLaunchPreset = useCallback(() => setWizardLaunchPreset(null), []);

  const openWizardWithChoice = useCallback((choice: ArchitectChoice) => {
    if (choice === 'normal' || choice === 'ai' || choice === 'reverse') {
      const modeMap: Record<ArchitectChoice, any> = {
        ai: 'ai',
        reverse: 'reverse',
        normal: 'normal',
        figma: 'figma',
        import_json: 'normal',
      };
      useProjectFlowStore.getState().createProject({
        projectName: t('common.untitled'),
        creationMode: modeMap[choice],
        projectType: 'landing',
        stack: 'react',
        templatePreset: 'landing-hero',
        backendStack: 'static',
      });
      void navigate({ to: '/editor', replace: true });
      return;
    }
    setWizardLaunchPreset({ choice, skipArchitectStep: true });
    setWizardOpen(true);
  }, [t, navigate]);

  const startFigmaImportFlow = useCallback(() => {
    void navigate({ to: '/editor' });
    requestAnimationFrame(() => useCanvasStore.getState().setFigmaImportDialogOpen(true));
  }, [navigate]);

  const workspaceLabel = projectMeta?.projectName ?? fileName ?? null;

  const sessionCardVisible = Boolean(projectMeta || fileName || isDirty);

  const recentRaw = getRecentFiles();
  const recentFiltered = useMemo(() => {
    const currentPath = filePath ?? null;
    return recentRaw.filter((r) => {
      if (currentPath && r.filePath && r.filePath === currentPath) return false;
      return true;
    });
  }, [recentRaw, filePath]);

  const q = searchQuery.trim().toLowerCase();

  const normalizedFilePath = filePath ? normalizePathForId(filePath) : null;

  const recentProjectRows = useMemo(() => {
    const byId = new Map<string, RecentFile>();
    for (const r of recentFiltered) {
      const id = recentProjectId(r);
      const prev = byId.get(id);
      if (!prev || r.lastOpened > prev.lastOpened) byId.set(id, r);
    }
    return [...byId.values()];
  }, [recentFiltered]);

  const sessionId = useMemo((): string | null => {
    if (!sessionCardVisible) return null;
    if (normalizedFilePath) return `path:${normalizedFilePath}`;
    return SESSION_PROJECT_VALUE;
  }, [sessionCardVisible, normalizedFilePath]);

  const workspaceProjectGridItems: LocalProjectGridItem[] = useMemo(() => {
    const rel = (ts: number) => {
      const { key, params } = relativeTime(ts);
      return i18n.t(key, params);
    };
    const items: LocalProjectGridItem[] = [];
    for (const r of recentProjectRows) {
      const id = recentProjectId(r);
      if (!assignmentByProject[id]) continue;
      const canOpen = Boolean(r.filePath && isElectron());
      items.push({
        id,
        title: r.fileName,
        subtitle: rel(r.lastOpened),
        canOpen,
        onOpen: async () => {
          const ok = await tryOpenRecentProjectFile(r);
          if (ok) void navigate({ to: '/editor' });
        },
      });
    }
    if (sessionCardVisible && sessionId && assignmentByProject[sessionId]) {
      const title = projectMeta?.projectName ?? fileName ?? t('common.untitled');
      const canOpen = normalizedFilePath ? Boolean(isElectron()) : true;
      items.unshift({
        id: sessionId,
        title,
        subtitle: t('projectFlow.projects.sessionRowSubtitle'),
        canOpen,
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
      });
    }
    return items;
  }, [
    recentProjectRows,
    assignmentByProject,
    sessionCardVisible,
    sessionId,
    projectMeta,
    fileName,
    normalizedFilePath,
    filePath,
    t,
    i18n,
    navigate,
  ]);

  const cmsProjectList = useMemo(
    () => buildCmsProjectList(recentProjectRows, sessionId, projectMeta, fileName, t, recentProjectId),
    [recentProjectRows, sessionId, projectMeta, fileName, t],
  );
  const { navFooterSlot, cmsAside } = useDashboardCmsSidebar(cmsProjectList);

  const projectSelectOptions = useMemo(() => {
    const allOpt = {
      value: 'all' as const,
      label: t('projectFlow.toolbar.allProjects', { defaultValue: 'All projects' }),
    };
    const labelById = new Map<string, string>();

    for (const r of recentProjectRows) {
      const id = recentProjectId(r);
      if (!assignmentByProject[id]) continue;
      if (!labelById.has(id)) labelById.set(id, r.fileName);
    }

    if (sessionId === SESSION_PROJECT_VALUE && assignmentByProject[SESSION_PROJECT_VALUE]) {
      labelById.set(
        SESSION_PROJECT_VALUE,
        projectMeta?.projectName ?? fileName ?? t('common.untitled'),
      );
    } else if (sessionId?.startsWith('path:') && assignmentByProject[sessionId]) {
      const existing = labelById.get(sessionId);
      const preferred = projectMeta?.projectName ?? fileName ?? existing ?? t('common.untitled');
      labelById.set(sessionId, preferred);
    }

    const projects = [...labelById.entries()].map(([value, label]) => ({ value, label }));
    projects.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    return [allOpt, ...projects];
  }, [t, recentProjectRows, sessionId, projectMeta?.projectName, fileName, assignmentByProject]);

  const validProjectIds = useMemo(
    () => new Set(projectSelectOptions.map((o) => o.value)),
    [projectSelectOptions],
  );

  useEffect(() => {
    if (!validProjectIds.has(projectFilter)) setProjectFilter('all');
  }, [projectFilter, validProjectIds]);

  const projectFilterLabel = useMemo(() => {
    const found = projectSelectOptions.find((o) => o.value === projectFilter);
    return found?.label ?? t('projectFlow.toolbar.allProjects', { defaultValue: 'All projects' });
  }, [projectSelectOptions, projectFilter, t]);

  const sortFieldTriggerLabel = useMemo(() => {
    if (sortField === 'alphabetical')
      return t('projectFlow.toolbar.sortAlphabetical', { defaultValue: 'Alphabetical' });
    if (sortField === 'dateCreated')
      return t('projectFlow.toolbar.sortDateCreated', { defaultValue: 'Date created' });
    return t('projectFlow.toolbar.sortLastViewed', { defaultValue: 'Last viewed' });
  }, [sortField, t]);

  const hasWorkspaceProjectCards = workspaceProjectGridItems.length > 0;
  const hasLibraryContent = hasWorkspaceProjectCards || isAuthenticated;
  const filterOrSearchActive = q.length > 0 || projectFilter !== 'all';
  const showBlankSlateState = !hasLibraryContent && !filterOrSearchActive;
  const showFilterEmptyState = filterOrSearchActive && !showBlankSlateState;

  const formatRelative = (ts: number) => {
    const { key, params } = relativeTime(ts);
    return i18n.t(key, params);
  };

  const cardShell =
    'group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-primary/35 hover:shadow-md';
  const thumbArea = 'relative flex aspect-[16/10] items-center justify-center bg-muted/50';

  return (
    <DashboardShell
      navSections={navSections}
      navFooterSlot={navFooterSlot}
      workspaceLabel={workspaceLabel}
      workspaceActive={Boolean(projectMeta || fileName)}
      sidebarSearchQuery={searchQuery}
      onSidebarSearchChange={setSearchQuery}
    >
      <NewProjectWizardDialog
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setWizardLaunchPreset(null);
        }}
        onProjectCreated={() => {
          setWizardOpen(false);
          setWizardLaunchPreset(null);
          queueMicrotask(() => {
            void navigate({ to: '/editor', replace: true });
          });
        }}
        launchPreset={wizardLaunchPreset}
        onLaunchPresetConsumed={clearWizardLaunchPreset}
      />

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
          <NewProjectCreateMenu
            variant="compact"
            onWizardPreset={openWizardWithChoice}
            onFigma={startFigmaImportFlow}
            onImport={() => void handleOpenFile()}
          />
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8">
          <header className="shrink-0 flex flex-col gap-[18px]">
            <div className="flex w-full items-center justify-between gap-4">
              <nav
                className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
                aria-label={t('projectFlow.shell.breadcrumbAria')}
              >
                <span className="font-medium text-foreground">{t('projectFlow.shell.projects')}</span>
              </nav>
              <NewProjectCreateMenu
                variant="default"
                onWizardPreset={openWizardWithChoice}
                onFigma={startFigmaImportFlow}
                onImport={() => void handleOpenFile()}
              />
            </div>
            <div className="flex w-full max-w-full flex-wrap items-stretch justify-end gap-1.5">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-7 w-[min(100%,12rem)] border-border bg-background text-xs shadow-sm">
                  <SelectValue>{projectFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projectSelectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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

          {workspaceProjectGridItems.length > 0 ? (
            <div className="mt-8 mb-6">
              <h2 className="mb-3 text-sm font-semibold">{t('projectFlow.projects.workspaceFilesHeading')}</h2>
              <LocalProjectGrid
                items={workspaceProjectGridItems}
                viewMode={viewMode}
                emptyMessage={t('projectFlow.projects.workspaceFilesEmpty')}
              />
            </div>
          ) : !showBlankSlateState && !showFilterEmptyState ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {t('projectFlow.projects.noWorkspaceFilesHint')}{' '}
              <Link to="/workspaces" className="font-medium text-primary underline-offset-2 hover:underline">
                {t('projectFlow.workspaces.title')}
              </Link>
              {' · '}
              <Link to="/drafts" className="font-medium text-primary underline-offset-2 hover:underline">
                {t('projectFlow.shell.navDrafts')}
              </Link>
            </p>
          ) : null}

          {showFilterEmptyState || showBlankSlateState ? (
            <div className="flex min-h-[min(28rem,calc(100dvh-12rem))] flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                {showFilterEmptyState ? t('projectFlow.dashboard.emptyGrid') : t('projectFlow.dashboard.emptySubtitle')}
              </p>
            </div>
          ) : (
            <>
              {/* Cloud Projects Section */}
              {isAuthenticated && (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <Cloud size={16} className="text-primary" />
                      {t('projectFlow.dashboard.cloudProjects', { defaultValue: 'Cloud Projects' })}
                    </h2>
                    {isLoadingCloud && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  
                  {cloudSites.length === 0 && !isLoadingCloud ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                      <p className="text-xs text-muted-foreground">
                        {t('projectFlow.dashboard.noCloudProjects', { defaultValue: 'You have no design projects in the cloud yet.' })}
                      </p>
                    </div>
                  ) : (
                    <div className={cn(
                      'gap-4',
                      viewMode === 'grid'
                        ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        : 'flex flex-col',
                    )}>
                      {cloudSites.map(site => (
                         <article key={site.id} className={cn(cardShell, viewMode === 'list' && 'flex flex-row')}>
                            <div className={cn(thumbArea, viewMode === 'list' && 'aspect-auto w-36 min-h-[7.5rem] shrink-0 border-r border-border sm:w-44')}>
                               <PenTool className="h-14 w-14 text-primary/40" strokeWidth={1} />
                               <div className="absolute inset-0 flex items-center justify-center bg-background/0 p-4 opacity-0 transition group-hover:bg-background/70 group-hover:opacity-100">
                                 <Button type="button" onClick={() => navigate({ to: '/editor', search: { siteId: site.id } as any })}>
                                   {t('projectFlow.dashboard.cardOpenEditor')}
                                 </Button>
                               </div>
                            </div>
                            <div className={cn('border-t border-border p-3', viewMode === 'list' && 'flex flex-1 flex-col justify-center border-t-0 border-l-0')}>
                              <h3 className="truncate text-sm font-semibold">{site.name}</h3>
                              <p className="mt-1 text-[11px] text-muted-foreground">{formatRelative(new Date(site.updatedAt).getTime())}</p>
                              <span className="mt-2 inline-flex w-fit items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                <Check size={10} /> {t('projectFlow.dashboard.cloudSynced', { defaultValue: 'Cloud Site' })}
                              </span>
                            </div>
                         </article>
                      ))}
                    </div>
                  )}
                  <Separator className="mt-8" />
                </div>
              )}
          </>
        )}

          </div>

          {cmsAside}
        </div>
      </div>
    </DashboardShell>
  );
}
