import { createFileRoute } from '@tanstack/react-router';
import { WorkspacesListPage } from '@/components/project-flow/workspaces-list-page';

export const Route = createFileRoute('/workspaces')({
  component: WorkspacesListPage,
  head: () => ({
    meta: [{ title: 'Buildev — Workspaces' }],
  }),
});
