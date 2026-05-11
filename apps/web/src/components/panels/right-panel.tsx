import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/stores/canvas-store';
import type { RightPanelTab } from '@/stores/canvas-store';
import PropertyPanel from './property-panel';
import CodePanel from './code-panel';
import DesignMotionSettings from './design-motion-settings';

const MIN_WIDTH = 256; // 16rem (w-64)
const MAX_WIDTH = 640; // 40rem
const DEFAULT_WIDTH = 256;

function DesignMotionCollapsible() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left hover:bg-accent/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {t('rightPanel.design.motion.section', {
            defaultValue: 'Motion & codegen',
          })}
        </span>
      </button>
      {open ? (
        <div className="min-h-0">
          <DesignMotionSettings className="max-h-[min(220px,32vh)] overflow-y-auto border-0 bg-transparent" />
        </div>
      ) : null}
    </div>
  );
}

export default function RightPanel() {
  const { t } = useTranslation();
  const ideModeOpen = useCanvasStore((s) => s.ideModeOpen);
  const activeTab = useCanvasStore((s) => s.rightPanelTab);
  const setTab = useCanvasStore((s) => s.setRightPanelTab);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        // Dragging left border: moving mouse left => wider
        const delta = startX.current - ev.clientX;
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta));
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [width],
  );

  const tabs: { key: RightPanelTab; label: string }[] = [
    { key: 'design', label: t('rightPanel.design', { defaultValue: 'Design' }) },
    { key: 'code', label: t('rightPanel.code', { defaultValue: 'Code' }) },
  ];

  if (ideModeOpen) return null;

  return (
    <div
      className="relative flex h-full min-h-0 shrink-0 flex-col border-l border-border bg-card"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10"
        onMouseDown={handleMouseDown}
      />

      {/* Tab bar */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border bg-card px-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={cn(
              'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'design' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <PropertyPanel embedded />
          </div>
          <div className="shrink-0 border-t border-border bg-muted/30">
            <DesignMotionCollapsible />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CodePanel />
        </div>
      )}
    </div>
  );
}
