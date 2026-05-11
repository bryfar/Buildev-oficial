import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '@/stores/document-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Minus } from 'lucide-react';
import type {
  PenDesignMotionAnimationRow,
  PenDesignMotionConfig,
  PenDesignMotionEffectKind,
  PenDesignMotionEffectRow,
  PenDesignMotionPresetId,
  PenMotionLibraryId,
} from '@buildev/pen-types';
import { cn } from '@/lib/utils';

const LIBRARIES: PenMotionLibraryId[] = [
  'none',
  'css',
  'framer-motion',
  'gsap',
  'animate-css',
  'lottie',
];

const PRESETS: PenDesignMotionPresetId[] = [
  'none',
  'fade-in',
  'slide-up',
  'slide-in-left',
  'scale-in',
  'zoom-in',
  'stagger-children',
];

const EFFECT_KINDS: PenDesignMotionEffectKind[] = [
  'scroll-reveal',
  'backdrop-blur',
  'stagger-children',
  'parallax',
  'prefers-reduced-motion',
  'custom',
];

const DEFAULTS = {
  motionHint:
    'Export and codegen hints only. Canvas playback is not wired yet (see document.designMotion in the saved file).',
  animationsTitle: 'Animations',
  primaryLibrary: 'Animation library',
  primaryPreset: 'Preset',
  extra: 'Additional',
  addAnimation: 'Add animation',
  emptyExtra: 'No extra animation rows.',
  effectsTitle: 'Effects',
  effectsEmpty: 'No motion effects yet.',
  customPlaceholder: 'custom-id',
} as const;

const LIBRARY_LABEL: Record<PenMotionLibraryId, string> = {
  none: 'None',
  css: 'CSS / keyframes',
  'framer-motion': 'Framer Motion',
  gsap: 'GSAP',
  'animate-css': 'Animate.css',
  lottie: 'Lottie',
};

const PRESET_LABEL: Record<PenDesignMotionPresetId, string> = {
  none: 'None',
  'fade-in': 'Fade in',
  'slide-up': 'Slide up',
  'slide-in-left': 'Slide in left',
  'scale-in': 'Scale in',
  'zoom-in': 'Zoom in',
  'stagger-children': 'Stagger children',
};

const EFFECT_KIND_LABEL: Record<PenDesignMotionEffectKind, string> = {
  'scroll-reveal': 'Scroll reveal',
  'backdrop-blur': 'Backdrop blur',
  'stagger-children': 'Stagger children',
  parallax: 'Parallax',
  'prefers-reduced-motion': 'Prefers reduced motion',
  custom: 'Custom',
};

function newRowId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultAnimationLibrary(dm: PenDesignMotionConfig | undefined): Exclude<PenMotionLibraryId, 'none'> {
  const p = dm?.primaryLibrary;
  if (p && p !== 'none') return p;
  return 'css';
}

export default function DesignMotionSettings({ className }: { className?: string }) {
  const { t } = useTranslation();
  const designMotion = useDocumentStore((s) => s.document.designMotion);
  const setDesignMotion = useDocumentStore((s) => s.setDesignMotion);

  const dm = designMotion ?? {};
  const primaryLibrary: PenMotionLibraryId = dm.primaryLibrary ?? 'none';
  const primaryPreset: PenDesignMotionPresetId = dm.primaryPreset ?? 'none';

  const patch = (next: PenDesignMotionConfig | undefined) => {
    const empty =
      !next ||
      ((!next.primaryLibrary || next.primaryLibrary === 'none') &&
        (!next.primaryPreset || next.primaryPreset === 'none') &&
        !(next.extraAnimations && next.extraAnimations.length > 0) &&
        !(next.motionEffects && next.motionEffects.length > 0));
    setDesignMotion(empty ? undefined : next);
  };

  return (
    <div className={cn('shrink-0 px-3 py-2 text-xs text-muted-foreground', className)}>
      <p className="leading-snug mb-2">
        {t('rightPanel.design.motion.hint', { defaultValue: DEFAULTS.motionHint })}
      </p>

      <div className="space-y-2">
        <div>
          <div className="flex min-h-7 items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {t('rightPanel.design.animations.title', { defaultValue: DEFAULTS.animationsTitle })}
            </span>
          </div>
          <div className="space-y-1.5 mt-1">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground block">
                {t('rightPanel.design.animations.primaryLibrary', {
                  defaultValue: DEFAULTS.primaryLibrary,
                })}
              </span>
              <Select
                value={primaryLibrary}
                onValueChange={(v) => {
                  const lib = v as PenMotionLibraryId;
                  patch({
                    ...dm,
                    primaryLibrary: lib,
                    primaryPreset: lib === 'none' ? 'none' : primaryPreset === 'none' ? 'fade-in' : primaryPreset,
                  });
                }}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARIES.map((id) => (
                    <SelectItem key={id} value={id}>
                      {t(`rightPanel.design.animations.library.${id.replace(/-/g, '_')}`, {
                        defaultValue: LIBRARY_LABEL[id],
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground block">
                {t('rightPanel.design.animations.primaryPreset', { defaultValue: DEFAULTS.primaryPreset })}
              </span>
              <Select
                value={primaryPreset}
                disabled={primaryLibrary === 'none'}
                onValueChange={(v) =>
                  patch({
                    ...dm,
                    primaryPreset: v as PenDesignMotionPresetId,
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {t(`rightPanel.design.animations.preset.${id.replace(/-/g, '_')}`, {
                        defaultValue: PRESET_LABEL[id],
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs text-muted-foreground">
                {t('rightPanel.design.animations.extra', { defaultValue: DEFAULTS.extra })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => {
                  const lib = defaultAnimationLibrary(dm);
                  const row: PenDesignMotionAnimationRow = {
                    id: newRowId(),
                    library: lib,
                    preset: 'fade-in',
                  };
                  patch({
                    ...dm,
                    extraAnimations: [...(dm.extraAnimations ?? []), row],
                  });
                }}
              >
                <Plus className="w-3 h-3" />
                {t('rightPanel.design.animations.add', { defaultValue: DEFAULTS.addAnimation })}
              </Button>
            </div>

            {(dm.extraAnimations ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground/80 italic py-1">
                {t('rightPanel.design.animations.emptyExtra', { defaultValue: DEFAULTS.emptyExtra })}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {(dm.extraAnimations ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="rounded border border-border/80 bg-secondary/40 p-1.5 space-y-1"
                  >
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-5 w-5"
                        onClick={() => {
                          const next = (dm.extraAnimations ?? []).filter((r) => r.id !== row.id);
                          patch({
                            ...dm,
                            extraAnimations: next.length ? next : undefined,
                          });
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <Select
                        value={row.library}
                        onValueChange={(v) => {
                          const lib = v as PenDesignMotionAnimationRow['library'];
                          const list = (dm.extraAnimations ?? []).map((r) =>
                            r.id === row.id ? { ...r, library: lib } : r,
                          );
                          patch({ ...dm, extraAnimations: list });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs px-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIBRARIES.filter((x) => x !== 'none').map((id) => (
                            <SelectItem key={id} value={id}>
                              {t(`rightPanel.design.animations.library.${id.replace(/-/g, '_')}`, {
                                defaultValue: LIBRARY_LABEL[id],
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={row.preset}
                        onValueChange={(v) => {
                          const preset = v as PenDesignMotionPresetId;
                          const list = (dm.extraAnimations ?? []).map((r) =>
                            r.id === row.id ? { ...r, preset } : r,
                          );
                          patch({ ...dm, extraAnimations: list });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs px-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRESETS.map((id) => (
                            <SelectItem key={id} value={id}>
                              {t(`rightPanel.design.animations.preset.${id.replace(/-/g, '_')}`, {
                                defaultValue: PRESET_LABEL[id],
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex min-h-7 items-center justify-between gap-1">
            <span className="text-xs text-muted-foreground">
              {t('rightPanel.design.effects.title', { defaultValue: DEFAULTS.effectsTitle })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={() => {
                const row: PenDesignMotionEffectRow = {
                  id: newRowId(),
                  kind: 'scroll-reveal',
                };
                patch({
                  ...dm,
                  motionEffects: [...(dm.motionEffects ?? []), row],
                });
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {(dm.motionEffects ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground/80 italic py-1">
              {t('rightPanel.design.effects.empty', { defaultValue: DEFAULTS.effectsEmpty })}
            </p>
          ) : (
            <ul className="space-y-1.5 mt-1">
              {(dm.motionEffects ?? []).map((row) => (
                <li
                  key={row.id}
                  className="rounded border border-border/80 bg-secondary/40 p-1.5 space-y-1"
                >
                  <div className="flex items-center gap-1">
                    <Select
                      value={row.kind}
                      onValueChange={(v) => {
                        const kind = v as PenDesignMotionEffectKind;
                        const list = (dm.motionEffects ?? []).map((r) =>
                          r.id === row.id ? { ...r, kind, customId: kind === 'custom' ? r.customId : undefined } : r,
                        );
                        patch({ ...dm, motionEffects: list });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EFFECT_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`rightPanel.design.effects.kind.${k.replace(/-/g, '_')}`, {
                              defaultValue: EFFECT_KIND_LABEL[k],
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        const next = (dm.motionEffects ?? []).filter((r) => r.id !== row.id);
                        patch({
                          ...dm,
                          motionEffects: next.length ? next : undefined,
                        });
                      }}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                  </div>
                  {row.kind === 'custom' && (
                    <input
                      type="text"
                      className="w-full h-7 text-xs rounded border border-input bg-background px-2"
                      placeholder={t('rightPanel.design.effects.customPlaceholder', {
                        defaultValue: DEFAULTS.customPlaceholder,
                      })}
                      value={row.customId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const list = (dm.motionEffects ?? []).map((r) =>
                          r.id === row.id ? { ...r, customId: v || undefined } : r,
                        );
                        patch({ ...dm, motionEffects: list });
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
