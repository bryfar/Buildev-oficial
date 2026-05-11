import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  createFileRoute,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, SlidersHorizontal, Check } from 'lucide-react';

import { PreviewDeviceShell } from '@/components/preview/preview-device-shell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMatchesMaxWidth } from '@/hooks/use-max-width-media';
import { readPreviewPayload } from '@/utils/preview-payload-key';
import { buildActivePagePreviewHtml, buildPreviewIframeFallbackHtml } from '@/utils/preview-html';
import {
  getPreviewDevicePreset,
  PREVIEW_DEVICE_PRESETS,
  type PreviewDevicePreset,
  type PreviewDevicePresetId,
} from '@/utils/preview-device-presets';

const MOBILE_MOCKUP_IDS: PreviewDevicePresetId[] = ['ios-iphone', 'android-phone', 'ipad'];
const MOBILE_MOCKUPS = PREVIEW_DEVICE_PRESETS.filter((p) => MOBILE_MOCKUP_IDS.includes(p.id));

const CANVAS_DOT_BG = {
  backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
} as const;

const CANVAS_PAD_X = 32;
const CANVAS_PAD_Y = 48;

export const Route = createFileRoute('/preview/$pageId')({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): { s?: string } => ({
    s: typeof raw.s === 'string' && raw.s.length > 0 ? raw.s : undefined,
  }),
  head: () => ({
    meta: [{ title: 'Buildev — Preview' }],
  }),
  component: PreviewHostPage,
});

function PreviewHostPage() {
  const { t } = useTranslation();
  const { pageId } = useParams({ from: '/preview/$pageId' });
  const { s: sessionKey } = useSearch({ from: '/preview/$pageId' });
  const navigate = useNavigate();

  const compactToolbar = useMatchesMaxWidth(767);
  const [presetListMenuOpen, setPresetListMenuOpen] = useState(false);

  const [presetId, setPresetId] = useState<PreviewDevicePresetId>(PREVIEW_DEVICE_PRESETS[0]!.id);
  const activePreset = useMemo(() => getPreviewDevicePreset(presetId), [presetId]);
  const [customWidth, setCustomWidth] = useState(activePreset.width);
  const [customHeight, setCustomHeight] = useState(activePreset.height);

  const handlePresetChange = useCallback((id: string) => {
    const next = getPreviewDevicePreset(id);
    setPresetId(next.id);
    setCustomWidth(next.width);
    setCustomHeight(next.height);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || !sessionKey) return;
    const result = readPreviewPayload(pageId, sessionKey);
    if (result.ok) return;
    if (result.error === 'missing-session') return;
    console.warn('[preview] Stored preview payload missing or invalid:', result.error, { routePageId: pageId });
  }, [pageId, sessionKey]);

  const { html, pageLabel, error } = useMemo(() => {
    const read = readPreviewPayload(pageId, sessionKey);
    if (!read.ok) {
      return { html: null as string | null, pageLabel: null as string | null, error: read.error };
    }
    const { payload } = read;
    const resolvedPageId = payload.pageId;
    const doc = payload.document;
    const pageMeta = doc?.pages?.find((p) => p.id === resolvedPageId);
    const label = pageMeta?.name?.trim() || 'Page';
    try {
      const built = buildActivePagePreviewHtml(doc, resolvedPageId, { includeAppTopBar: false });
      const trimmed = built?.trim() ?? '';
      if (!trimmed) {
        return {
          html: buildPreviewIframeFallbackHtml('Preview HTML was empty.'),
          pageLabel: label,
          error: null,
        };
      }
      return { html: built, pageLabel: label, error: null };
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[preview] buildActivePagePreviewHtml failed:', err);
      }
      return {
        html: buildPreviewIframeFallbackHtml('Preview could not be generated. Try again from the editor.'),
        pageLabel: label,
        error: null,
      };
    }
  }, [sessionKey, pageId]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [shellScale, setShellScale] = useState(1);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const measure = () => {
      const { clientWidth, clientHeight } = el;
      const aw = Math.max(0, clientWidth - CANVAS_PAD_X);
      const ah = Math.max(0, clientHeight - CANVAS_PAD_Y);
      const sw = activePreset.shellWidth;
      const sh = activePreset.shellHeight;
      const next = Math.min(aw / sw, ah / sh, 1);
      setShellScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activePreset.shellWidth, activePreset.shellHeight]);

  const backToEditor = () => {
    void navigate({ to: '/editor' });
  };

  const iframeTitle = t('preview.iframeTitle', { defaultValue: 'Buildev preview' });
  const iframeSrc = html ?? buildPreviewIframeFallbackHtml('Nothing to preview.');

  const sizeFieldClass =
    'h-8 w-[72px] shrink-0 rounded-md border border-input bg-background px-2 text-xs text-foreground tabular-nums shadow-sm outline-none ring-offset-background transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring';

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-8 text-center text-foreground">
        <p className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
          {error === 'missing-session'
            ? t('preview.missingSession', { defaultValue: 'Open preview from the editor (Preview button).' })
            : error === 'mismatch' || error === 'invalid-payload'
              ? t('preview.invalidPayload', {
                  defaultValue: 'Preview link does not match the stored page. Open preview again from the editor.',
                })
              : t('preview.sessionExpired', {
                  defaultValue: 'Preview data is missing or expired. Open preview again from the editor.',
                })}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={backToEditor}>
          {t('preview.backToEditor', { defaultValue: 'Back to Editor' })}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      <header
        className={cn(
          'shrink-0 border-b border-border bg-card/80 px-3 text-card-foreground backdrop-blur-sm md:px-5',
          compactToolbar ? 'flex flex-col gap-2 py-3' : 'flex h-[52px] items-center justify-between py-0',
        )}
      >
        <div
          className={cn(
            'min-w-0 font-medium tracking-tight text-foreground',
            compactToolbar ? 'text-sm' : 'truncate pr-3 text-sm md:text-[15px]',
          )}
        >
          {t('preview.modeStatus', {
            defaultValue: 'Preview — {{page}}',
            page: pageLabel ?? pageId,
          })}
        </div>

        {compactToolbar ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('preview.mockups', { defaultValue: 'Mockups' })}
              </span>
              {MOBILE_MOCKUPS.map((p: PreviewDevicePreset) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={presetId === p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn(
                    'shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    presetId === p.id
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {p.shortLabel}
                </button>
              ))}
              <DropdownMenu open={presetListMenuOpen} onOpenChange={setPresetListMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 gap-1 border-border px-2 text-[11px] font-normal"
                  >
                    {t('preview.allDevices', { defaultValue: 'All devices' })}
                    <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {t('preview.devicePresets', { defaultValue: 'Device presets' })}
                  </DropdownMenuLabel>
                  {PREVIEW_DEVICE_PRESETS.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 text-xs"
                      onClick={() => {
                        handlePresetChange(p.id);
                        setPresetListMenuOpen(false);
                      }}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-primary">
                        {presetId === p.id ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                      </span>
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 px-3 text-xs"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                    {t('preview.canvasSize', { defaultValue: 'Canvas size' })}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[220px]" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <div className="space-y-2 px-2 py-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="op-prev-w-m" className="w-5 shrink-0 text-[11px] text-muted-foreground">
                        W
                      </label>
                      <input
                        id="op-prev-w-m"
                        type="number"
                        min={240}
                        max={2400}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className={cn(sizeFieldClass, 'min-w-0 flex-1')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="op-prev-h-m" className="w-5 shrink-0 text-[11px] text-muted-foreground">
                        H
                      </label>
                      <input
                        id="op-prev-h-m"
                        type="number"
                        min={240}
                        max={2400}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className={cn(sizeFieldClass, 'min-w-0 flex-1')}
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" size="sm" className="h-8 shrink-0 text-xs" variant="default" onClick={backToEditor}>
                {t('preview.backToEditor', { defaultValue: 'Back to Editor' })}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 md:gap-3">
            <Select value={presetId} onValueChange={handlePresetChange}>
              <SelectTrigger className="h-8 max-w-[220px] min-w-[140px] border-border text-xs" aria-label={t('preview.devicePresets', { defaultValue: 'Device presets' })}>
                <SelectValue placeholder={t('preview.devicePresets', { defaultValue: 'Device presets' })} />
              </SelectTrigger>
              <SelectContent>
                {PREVIEW_DEVICE_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <label htmlFor="op-prev-w" className="w-3.5 shrink-0 text-center font-medium text-muted-foreground">
                W
              </label>
              <input
                id="op-prev-w"
                type="number"
                min={240}
                max={2400}
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className={sizeFieldClass}
              />
              <label htmlFor="op-prev-h" className="ml-1 w-3.5 shrink-0 text-center font-medium text-muted-foreground">
                H
              </label>
              <input
                id="op-prev-h"
                type="number"
                min={240}
                max={2400}
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
                className={sizeFieldClass}
              />
            </div>
            <Button type="button" size="sm" className="h-8 shrink-0 text-xs" variant="secondary" onClick={backToEditor}>
              {t('preview.backToEditor', { defaultValue: 'Back to Editor' })}
            </Button>
          </div>
        )}
      </header>

      <div
        ref={canvasRef}
        className="relative flex min-h-0 flex-1 justify-center overflow-auto px-4 py-6 md:px-6 md:py-10"
        style={CANVAS_DOT_BG}
      >
        <div className="flex min-h-min w-full min-w-0 flex-col items-center gap-1 pb-4 pt-2">
          {activePreset.topBarLabel ? (
            <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {activePreset.topBarLabel}
            </p>
          ) : null}
          <PreviewDeviceShell
            preset={activePreset}
            shellScale={shellScale}
            iframeTitle={iframeTitle}
            srcDoc={iframeSrc}
            contentWidth={customWidth}
            contentHeight={customHeight}
          />
        </div>
      </div>
    </div>
  );
}
