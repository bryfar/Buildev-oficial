import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { ChevronRight, Moon, Search, Sun, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAgentSettingsStore } from '@/stores/agent-settings-store';
import AgentSettingsDialog from '@/components/shared/agent-settings-dialog';
import { useWorkspaceRegistryStore } from '@/stores/workspace-registry-store';

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
}

export interface DashboardNavSection {
  id: string;
  title: string;
  items: DashboardNavItem[];
}

interface DashboardShellProps {
  navSections: DashboardNavSection[];
  /** Optional block below main nav (e.g. CMS project list). */
  navFooterSlot?: ReactNode;
  workspaceLabel?: string | null;
  workspaceActive?: boolean;
  children: ReactNode;
  className?: string;
  sidebarSearchQuery?: string;
  onSidebarSearchChange?: (value: string) => void;
}

export function DashboardShell({
  navSections,
  navFooterSlot,
  workspaceLabel,
  workspaceActive,
  children,
  className,
  sidebarSearchQuery,
  onSidebarSearchChange,
}: DashboardShellProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useAppTheme();
  const setAgentDialogOpen = useAgentSettingsStore((s) => s.setDialogOpen);

  useEffect(() => {
    useWorkspaceRegistryStore.getState().hydrate();
  }, []);

  return (
    <div className={cn('flex min-h-screen bg-background text-foreground', className)}>
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-border bg-muted/25 md:flex">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/logo-buildev.svg"
              alt=""
              className="h-[28px] max-w-[148px] shrink-0 object-contain object-left"
              width={148}
              height={28}
            />
            <span className="sr-only">Buildev</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('projectFlow.shell.themeLight') : t('projectFlow.shell.themeDark')}
            title={theme === 'dark' ? t('projectFlow.shell.themeLight') : t('projectFlow.shell.themeDark')}
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </Button>
        </div>

        {onSidebarSearchChange !== undefined && sidebarSearchQuery !== undefined ? (
          <div className="border-b border-border px-2 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={sidebarSearchQuery}
                onChange={(e) => onSidebarSearchChange(e.target.value)}
                placeholder={t('projectFlow.shell.sidebarSearch')}
                className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none ring-primary/25 focus-visible:ring-2"
              />
            </div>
          </div>
        ) : null}

        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
          {navSections.map((section) => (
            <div key={section.id}>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition',
                      item.active
                        ? 'bg-primary/15 font-medium text-foreground ring-1 ring-primary/25'
                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                    )}
                  >
                    <span className="shrink-0 opacity-90">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {navFooterSlot ? <div className="shrink-0 border-t border-border">{navFooterSlot}</div> : null}

        <div className="mt-auto space-y-2 border-t border-border p-3">
          <button
            type="button"
            onClick={() => setAgentDialogOpen(true, { tab: 'general' })}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <User size={18} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{t('projectFlow.shell.profileName')}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t('projectFlow.shell.profileSubtitle')}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
          <div className="rounded-lg border border-border bg-card px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('projectFlow.shell.currentWorkspace')}
            </p>
            {workspaceLabel ? (
              <div className="mt-1 flex items-center gap-2">
                {workspaceActive ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> : null}
                <span className="truncate text-xs font-medium">{workspaceLabel}</span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{t('projectFlow.shell.noProjectOpen')}</p>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>

      <AgentSettingsDialog />
    </div>
  );
}
