import { useLayoutEffect } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';

/** Deep links to `/new-project` stay in the SPA (no full reload) and land on home with `?new=1`. */
export const Route = createFileRoute('/new-project')({
  ssr: false,
  component: NewProjectRedirect,
  head: () => ({
    meta: [{ title: 'Buildev - New Project' }],
  }),
});

function NewProjectRedirect() {
  const router = useRouter();
  useLayoutEffect(() => {
    void router.navigate({ to: '/', search: { new: '1' }, replace: true });
  }, [router]);
  return null;
}
