import { useLayoutEffect } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';

/** Legacy URL: `/project-dashboard` → home at `/`. */
export const Route = createFileRoute('/project-dashboard')({
  ssr: false,
  component: LegacyProjectDashboardRedirect,
  head: () => ({
    meta: [{ title: 'Buildev' }],
  }),
});

function LegacyProjectDashboardRedirect() {
  const router = useRouter();
  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = Object.fromEntries(params.entries()) as Record<string, string>;
    const hash = window.location.hash || undefined;
    const hasSearch = Object.keys(search).length > 0;
    void router.navigate({
      to: '/',
      ...(hasSearch ? { search } : {}),
      ...(hash ? { hash } : {}),
      replace: true,
    });
  }, [router]);
  return null;
}
