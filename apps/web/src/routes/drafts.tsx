import { createFileRoute } from '@tanstack/react-router';
import { DraftsPage } from '@/components/project-flow/drafts-page';

export const Route = createFileRoute('/drafts')({
  component: DraftsPage,
  head: () => ({
    meta: [{ title: 'Buildev — Drafts' }],
  }),
});
