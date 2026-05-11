import { PenTool } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StartupHeroVariant = 'full' | 'compact';

interface StartupHeroProps {
  variant?: StartupHeroVariant;
  /** Primary row under title (e.g. project name when dashboard has a doc). */
  subtitle?: string | null;
  onOpenFile?: () => void;
  onNewDesign?: () => void;
  className?: string;
}

function modifierKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ? '⌘' : 'Ctrl';
}

export function StartupHero({
  variant = 'full',
  subtitle,
  onOpenFile,
  onNewDesign,
  className,
}: StartupHeroProps) {
  const { t } = useTranslation();
  const mod = modifierKeyLabel();

  const iconSize = variant === 'full' ? 56 : 28;
  const titleClass =
    variant === 'full'
      ? 'text-5xl md:text-6xl font-semibold tracking-tight mt-10'
      : 'text-2xl md:text-3xl font-semibold tracking-tight mt-3';

  const inner = (
    <>
      <PenTool
        size={iconSize}
        strokeWidth={1.25}
        className={cn('mx-auto text-muted-foreground', variant === 'full' && 'drop-shadow-sm')}
        aria-hidden
      />
      <h1 className={cn(titleClass, 'flex flex-wrap items-center justify-center gap-x-3 gap-y-1')}>
        <span>{t('landing.open')}</span>
        <span className="text-primary">{t('landing.pencil')}</span>
      </h1>
      {subtitle ? (
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
          {subtitle}
        </p>
      ) : (
        <p className="text-muted-foreground mt-5 max-w-md mx-auto text-base md:text-lg leading-relaxed">
          {t('landing.tagline')}
        </p>
      )}
      <p className="text-xs text-muted-foreground/90 mt-6">
        {t('landing.shortcutHint', { key1: mod, key2: 'N' })}
      </p>
      {(onOpenFile || onNewDesign) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {onOpenFile && (
            <Button type="button" variant="outline" size="lg" className="min-w-[8.5rem]" onClick={onOpenFile}>
              {t('landing.open')}
            </Button>
          )}
          {onNewDesign && (
            <Button type="button" size="lg" className="min-w-[8.5rem]" onClick={onNewDesign}>
              {t('landing.newDesign')}
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <section
      className={cn(
        'relative flex flex-col items-center justify-center text-center px-6',
        variant === 'full'
          ? 'min-h-[min(60vh,560px)] py-16 md:py-24 bg-gradient-to-b from-muted/25 via-background to-background'
          : 'py-8 border-b border-border/70 bg-muted/15',
        className,
      )}
    >
      {variant === 'full' ? (
        inner
      ) : (
        <div className="w-full max-w-3xl rounded-2xl border border-border/80 bg-card/35 px-6 py-6 shadow-sm backdrop-blur-sm dark:bg-card/25">
          {inner}
        </div>
      )}
    </section>
  );
}
