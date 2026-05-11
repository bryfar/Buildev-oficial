import { useEffect, useRef } from 'react';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Terminal, Pen, Settings, Image, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAgentSettingsStore } from '@/stores/agent-settings-store';
import { AgentSettingsGeneralTab } from './agent-settings-general-tab';
import { ProvidersTab } from './agent-settings-providers-tab';
import { McpTab } from './agent-settings-mcp-tab';
import { ImagesPage } from './agent-settings-images-page';
import { SystemTab } from './agent-settings-system-tab';

/* ---------- Sidebar nav item ---------- */
function NavItem({
  icon: IconComp,
  label,
  active,
  onClick,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-[13px] transition-colors text-left',
        active
          ? 'bg-secondary text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40',
      )}
    >
      <IconComp size={14} className="shrink-0" />
      {label}
    </button>
  );
}

/* ---------- Main Dialog ---------- */
export default function AgentSettingsDialog() {
  const { t } = useTranslation();
  const open = useAgentSettingsStore((s) => s.dialogOpen);
  const setDialogOpen = useAgentSettingsStore((s) => s.setDialogOpen);
  const dialogTab = useAgentSettingsStore((s) => s.dialogTab);
  const setDialogTab = useAgentSettingsStore((s) => s.setDialogTab);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDialogOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setDialogOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80" onClick={() => setDialogOpen(false)} />
      <div
        ref={dialogRef}
        className="relative bg-card rounded-xl border border-border w-[720px] min-h-[520px] max-h-[720px] overflow-hidden shadow-xl flex"
      >
        {/* Sidebar */}
        <div className="w-[200px] shrink-0 border-r border-border flex flex-col bg-card">
          <div className="px-4 pt-4 pb-3">
            <h2 className="text-[15px] font-semibold text-foreground">{t('settings.title')}</h2>
          </div>
          <nav className="flex-1 space-y-0.5 px-2">
            <NavItem
              icon={SlidersHorizontal}
              label={t('settings.general')}
              active={dialogTab === 'general'}
              onClick={() => setDialogTab('general')}
            />
            <NavItem
              icon={Pen}
              label={t('settings.agents')}
              active={dialogTab === 'agents'}
              onClick={() => setDialogTab('agents')}
            />
            <NavItem
              icon={Terminal}
              label={t('settings.mcp')}
              active={dialogTab === 'mcp'}
              onClick={() => setDialogTab('mcp')}
            />
            <NavItem
              icon={Image}
              label={t('settings.images')}
              active={dialogTab === 'images'}
              onClick={() => setDialogTab('images')}
            />
            <NavItem
              icon={Settings}
              label={t('settings.system')}
              active={dialogTab === 'system'}
              onClick={() => setDialogTab('system')}
            />
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Close button */}
          <div className="flex justify-end px-4 pt-3">
            <Button variant="ghost" size="icon-sm" onClick={() => setDialogOpen(false)}>
              <X size={14} />
            </Button>
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {dialogTab === 'general' && <AgentSettingsGeneralTab />}
            {dialogTab === 'agents' && <ProvidersTab />}
            {dialogTab === 'mcp' && <McpTab />}
            {dialogTab === 'images' && <ImagesPage />}
            {dialogTab === 'system' && <SystemTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
