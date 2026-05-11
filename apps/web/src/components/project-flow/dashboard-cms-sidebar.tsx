import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentFile } from '@/utils/recent-files';

export function buildCmsProjectList(
  recentProjectRows: RecentFile[],
  sessionId: string | null,
  projectMeta: { type?: string; projectName?: string } | undefined,
  fileName: string | null,
  t: (key: string) => string,
  recentProjectId: (r: RecentFile) => string,
): { id: string; label: string }[] {
  const rows = recentProjectRows.slice(0, 12).map((r) => ({ id: recentProjectId(r), label: r.fileName }));
  if (projectMeta?.type === 'cms' && sessionId) {
    const label = projectMeta.projectName ?? fileName ?? t('common.untitled');
    if (!rows.some((r) => r.id === sessionId)) {
      rows.unshift({ id: sessionId, label });
    }
  }
  return rows;
}

/** CMS quick list + panel controls in the dashboard shell sidebar (shared by Projects and Recents). */
export function useDashboardCmsSidebar(cmsProjectList: { id: string; label: string }[]): {
  navFooterSlot: ReactNode;
  cmsAside: ReactNode | null;
} {
  const { t } = useTranslation();
  const [selectedCmsProjectId, setSelectedCmsProjectId] = useState<string | null>(null);
  const [cmsPanelOpen, setCmsPanelOpen] = useState(true);
  const [cmsPanelSection, setCmsPanelSection] = useState<'overview' | 'webhooks' | 'media'>('overview');

  const navFooterSlot = useMemo(
    () => (
      <div className="space-y-2 px-2 py-3">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('projectFlow.shell.navCms')}
        </p>
        {cmsProjectList.length === 0 ? (
          <p className="px-2 text-xs leading-snug text-muted-foreground">{t('projectFlow.shell.cmsEmpty')}</p>
        ) : (
          <div className="space-y-0.5">
            {cmsProjectList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedCmsProjectId(p.id);
                  setCmsPanelOpen(true);
                  setCmsPanelSection('overview');
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition',
                  selectedCmsProjectId === p.id
                    ? 'bg-primary/15 font-medium text-foreground ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>
        )}
        {selectedCmsProjectId ? (
          <div className="mt-1 space-y-0.5 border-l-2 border-primary/25 pl-2 pt-1">
            <button
              type="button"
              onClick={() => setCmsPanelOpen((o) => !o)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
            >
              <PanelRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
              {cmsPanelOpen ? t('projectFlow.shell.cmsHidePanel') : t('projectFlow.shell.cmsShowPanel')}
            </button>
            <button
              type="button"
              onClick={() => setCmsPanelSection('overview')}
              className={cn(
                'flex w-full rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-muted/80',
                cmsPanelSection === 'overview' ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {t('projectFlow.shell.cmsNavOverview')}
            </button>
            <button
              type="button"
              onClick={() => setCmsPanelSection('webhooks')}
              className={cn(
                'flex w-full rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-muted/80',
                cmsPanelSection === 'webhooks' ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {t('projectFlow.shell.cmsNavWebhooks')}
            </button>
            <button
              type="button"
              onClick={() => setCmsPanelSection('media')}
              className={cn(
                'flex w-full rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-muted/80',
                cmsPanelSection === 'media' ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {t('projectFlow.shell.cmsNavMedia')}
            </button>
          </div>
        ) : cmsProjectList.length > 0 ? (
          <p className="px-2 pt-1 text-[11px] leading-snug text-muted-foreground">{t('projectFlow.shell.cmsSelectFirst')}</p>
        ) : null}
      </div>
    ),
    [t, cmsProjectList, selectedCmsProjectId, cmsPanelOpen, cmsPanelSection],
  );

  const cmsAside = useMemo(() => {
    if (!selectedCmsProjectId || !cmsPanelOpen) return null;
    return (
      <aside className="flex max-h-[40vh] w-full shrink-0 flex-col border-t border-border bg-muted/20 p-4 md:max-h-none md:w-64 md:border-l md:border-t-0 md:overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('projectFlow.shell.cmsPanelTitle')}</p>
        <p className="mt-1 truncate text-sm font-medium text-foreground">
          {cmsProjectList.find((p) => p.id === selectedCmsProjectId)?.label ?? ''}
        </p>
        <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {cmsPanelSection === 'overview' ? <p>{t('projectFlow.shell.cmsPanelOverview')}</p> : null}
          {cmsPanelSection === 'webhooks' ? <p>{t('projectFlow.shell.cmsPanelWebhooks')}</p> : null}
          {cmsPanelSection === 'media' ? <p>{t('projectFlow.shell.cmsPanelMedia')}</p> : null}
        </div>
      </aside>
    );
  }, [selectedCmsProjectId, cmsPanelOpen, cmsProjectList, cmsPanelSection, t]);

  return { navFooterSlot, cmsAside };
}
