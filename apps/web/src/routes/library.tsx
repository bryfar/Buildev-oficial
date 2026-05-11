import { createFileRoute } from '@tanstack/react-router';
import { LibraryBrowsePage } from '@/components/project-flow/library-browse-page';

export const Route = createFileRoute('/library')({
  component: LibraryBrowsePage,
  head: () => ({
    meta: [{ title: 'Buildev — Library' }],
  }),
});
