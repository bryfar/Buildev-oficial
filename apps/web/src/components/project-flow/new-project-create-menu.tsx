import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Figma, Image as ImageIcon, PenTool, Plus, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { ArchitectChoice } from '@/components/project-flow/new-project-wizard-dialog';

export type NewProjectCreateMenuProps = {
  variant: 'compact' | 'default';
  onWizardPreset: (choice: ArchitectChoice) => void;
  onFigma: () => void;
  onImport: () => void;
};

export function NewProjectCreateMenu({ variant, onWizardPreset, onFigma, onImport }: NewProjectCreateMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const rowClass =
    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground';

  const menuBody = (
    <div className="py-1">
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          close();
          onWizardPreset('normal');
        }}
      >
        <PenTool className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{t('projectFlow.createMenu.design')}</span>
      </button>
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          close();
          onWizardPreset('ai');
        }}
      >
        <Sparkles className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{t('projectFlow.createMenu.ai')}</span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {t('projectFlow.createMenu.beta')}
        </span>
      </button>
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          close();
          onFigma();
        }}
      >
        <Figma className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{t('projectFlow.createMenu.figma')}</span>
      </button>
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          close();
          onWizardPreset('reverse');
        }}
      >
        <ImageIcon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{t('projectFlow.createMenu.fromImage')}</span>
      </button>
      <Separator className="my-1" />
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          close();
          onImport();
        }}
      >
        <Upload className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{t('projectFlow.createMenu.import')}</span>
      </button>
    </div>
  );

  const trigger =
    variant === 'compact' ? (
      <Button
        type="button"
        size="sm"
        className="h-8 shrink-0 gap-1.5 bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        <Plus size={14} strokeWidth={2} />
        <span>{t('projectFlow.createMenu.trigger')}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-90" aria-hidden />
      </Button>
    ) : (
      <Button
        type="button"
        className="h-9 shrink-0 gap-2 bg-primary px-3 text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        <Plus size={16} strokeWidth={2} />
        <span>{t('projectFlow.createMenu.trigger')}</span>
        <ChevronDown className="h-4 w-4 opacity-90" aria-hidden />
      </Button>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        arrow={false}
        className="w-[min(100vw-1.5rem,13.6rem)] border-border bg-popover p-0 shadow-lg"
      >
        {menuBody}
      </PopoverContent>
    </Popover>
  );
}
