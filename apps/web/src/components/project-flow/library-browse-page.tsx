import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight, FileText, Library, PenTool } from 'lucide-react';
import { DashboardShell } from '@/components/project-flow/dashboard-shell';
import { useDashboardNavSections } from '@/components/project-flow/dashboard-nav-sections';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/stores/document-store';

export function LibraryBrowsePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navSections = useDashboardNavSections();
  const projectMeta = useDocumentStore((s) => s.document.projectMeta);
  const fileName = useDocumentStore((s) => s.fileName);
  const workspaceLabel = projectMeta?.projectName ?? fileName ?? null;

  return (
    <DashboardShell
      navSections={navSections}
      workspaceLabel={workspaceLabel}
      workspaceActive={Boolean(projectMeta || fileName)}
    >
      <div className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
        <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-3 md:hidden">
          <PenTool className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
          <span className="text-sm font-semibold">{t('projectFlow.shell.library')}</span>
        </header>
        <div className="hidden shrink-0 border-b border-border px-4 py-5 sm:px-8 md:block">
          <nav
            className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
            aria-label={t('projectFlow.shell.breadcrumbAria')}
          >
            <Link to="/" className="font-medium text-foreground hover:underline">
              {t('projectFlow.shell.projects')}
            </Link>
            <ChevronRight size={12} className="shrink-0 opacity-60" aria-hidden />
            <span className="truncate font-medium text-foreground">{t('projectFlow.shell.library')}</span>
          </nav>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Library size={28} strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 text-lg font-semibold">{t('projectFlow.library.title')}</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{t('projectFlow.library.subtitle')}</p>
          <Button type="button" variant="outline" className="mt-8 gap-2" onClick={() => navigate({ to: '/' })}>
            <FileText size={16} />
            {t('projectFlow.library.backToDashboard')}
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}
