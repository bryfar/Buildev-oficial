import { createFileRoute } from '@tanstack/react-router';
import { HomeDashboardPage } from '@/components/project-flow/home-dashboard-page';

export const Route = createFileRoute('/')({
  validateSearch: (raw: Record<string, unknown>): { new?: string } => ({
    new: raw.new === '1' || raw.new === 1 ? '1' : undefined,
  }),
  component: HomeDashboardPage,
  head: () => ({
    meta: [{ title: 'Buildev' }],
  }),
});
