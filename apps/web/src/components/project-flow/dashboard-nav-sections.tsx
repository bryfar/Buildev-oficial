import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { FolderKanban, History, Inbox, LayoutDashboard, Library } from 'lucide-react';
import type { DashboardNavSection } from '@/components/project-flow/dashboard-shell';

export function useDashboardNavSections(): DashboardNavSection[] {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return useMemo(() => {
    const projectsActive = pathname === '/' || pathname === '';
    const workspacesActive = pathname === '/workspaces' || pathname.startsWith('/workspaces/');
    const draftsActive = pathname === '/drafts';
    const recentsActive = pathname === '/recents';
    const libraryActive = pathname === '/library';

    return [
      {
        id: 'section-main',
        title: t('projectFlow.shell.navMain'),
        items: [
          {
            id: 'projects',
            label: t('projectFlow.shell.projects'),
            icon: <LayoutDashboard size={16} strokeWidth={1.5} />,
            onClick: () => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              void navigate({ to: '/', replace: true });
            },
            active: projectsActive,
          },
          {
            id: 'workspaces',
            label: t('projectFlow.shell.navWorkspaces'),
            icon: <FolderKanban size={16} strokeWidth={1.5} />,
            onClick: () => void navigate({ to: '/workspaces' }),
            active: workspacesActive,
          },
          {
            id: 'drafts',
            label: t('projectFlow.shell.navDrafts'),
            icon: <Inbox size={16} strokeWidth={1.5} />,
            onClick: () => void navigate({ to: '/drafts' }),
            active: draftsActive,
          },
          {
            id: 'recents',
            label: t('projectFlow.shell.navRecents'),
            icon: <History size={16} strokeWidth={1.5} />,
            onClick: () => void navigate({ to: '/recents' }),
            active: recentsActive,
          },
        ],
      },
      {
        id: 'section-library',
        title: t('projectFlow.shell.navLibrary'),
        items: [
          {
            id: 'library',
            label: t('projectFlow.shell.library'),
            icon: <Library size={16} strokeWidth={1.5} />,
            onClick: () => void navigate({ to: '/library' }),
            active: libraryActive,
          },
        ],
      },
    ];
  }, [t, i18n.language, i18n.resolvedLanguage, navigate, pathname]);
}
