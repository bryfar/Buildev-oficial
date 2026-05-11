import { PenTool } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type LocalProjectGridItem = {
  id: string;
  title: string;
  subtitle: string;
  /** When false, open is disabled (e.g. browser without path). */
  canOpen: boolean;
  onOpen: () => void | Promise<void>;
  /** Optional text action below the subtitle (e.g. move to drafts). */
  footerAction?: { label: string; onClick: () => void };
};

type LocalProjectGridProps = {
  items: LocalProjectGridItem[];
  viewMode: 'grid' | 'list';
  emptyMessage: string;
};

const cardShell =
  'group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-primary/35 hover:shadow-md';
const thumbArea = 'relative flex aspect-[16/10] items-center justify-center bg-muted/50';

export function LocalProjectGrid({ items, viewMode, emptyMessage }: LocalProjectGridProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-4 py-10 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'gap-4',
        viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col',
      )}
    >
      {items.map((item) => (
        <article key={item.id} className={cn(cardShell, viewMode === 'list' && 'flex flex-row')}>
          <div
            className={cn(
              thumbArea,
              viewMode === 'list' && 'aspect-auto w-36 min-h-[7.5rem] shrink-0 border-r border-border sm:w-44',
            )}
          >
            <PenTool className="h-14 w-14 text-primary/40" strokeWidth={1} />
            <div className="absolute inset-0 flex items-center justify-center bg-background/0 p-4 opacity-0 transition group-hover:bg-background/70 group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                disabled={!item.canOpen}
                title={!item.canOpen ? t('projectFlow.localProjects.openUnavailableHint') : undefined}
                onClick={() => void item.onOpen()}
              >
                {t('projectFlow.dashboard.cardOpenEditor')}
              </Button>
            </div>
          </div>
          <div
            className={cn(
              'border-t border-border p-3',
              viewMode === 'list' && 'flex flex-1 flex-col justify-center border-t-0 border-l-0',
            )}
          >
            <h3 className="truncate text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.subtitle}</p>
            {item.footerAction ? (
              <button
                type="button"
                className="mt-2 text-left text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  item.footerAction?.onClick();
                }}
              >
                {item.footerAction.label}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
