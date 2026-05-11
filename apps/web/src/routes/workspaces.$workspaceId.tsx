import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceDetailPage } from '@/components/project-flow/workspace-detail-page';

export const Route = createFileRoute('/workspaces/$workspaceId')({
  component: WorkspaceDetailRoute,
  head: () => ({
    meta: [{ title: 'Buildev — Workspace' }],
  }),
});

function WorkspaceDetailRoute() {
  const { workspaceId } = Route.useParams();
  return <WorkspaceDetailPage workspaceId={workspaceId} />;
}
