import { createFileRoute } from '@tanstack/react-router';
import { RecentsPage } from '@/components/project-flow/recents-page';

export const Route = createFileRoute('/recents')({
  component: RecentsPage,
  head: () => ({
    meta: [{ title: 'Buildev — Recents' }],
  }),
});
