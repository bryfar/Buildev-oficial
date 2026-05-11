import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '@/stores/document-store';
import SectionHeader from '@/components/shared/section-header';
import { Button } from '@/components/ui/button';
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
  PenDesignMotionPresetId,
  PenMotionLibraryId,
} from '@/types/pen';

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

export default function AnimationSection() {
  const { t } = useTranslation();
  const designMotion = useDocumentStore((s) => s.document.designMotion);
  const setDesignMotion = useDocumentStore((s) => s.setDesignMotion);

  const dm = designMotion ?? {};

  const patch = (next: PenDesignMotionConfig | undefined) => {
    const empty =
      !next ||
      ((!next.primaryLibrary || next.primaryLibrary === 'none') &&
        (!next.primaryPreset || next.primaryPreset === 'none') &&
        !(next.extraAnimations && next.extraAnimations.length > 0) &&
        !(next.motionEffects && next.motionEffects.length > 0));
    setDesignMotion(empty ? undefined : next);
  };

  const handleAdd = () => {
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
  };

  const rows = dm.extraAnimations ?? [];

  return (
    <div className="space-y-1.5">
      <SectionHeader
        title={t('animation.title', { defaultValue: 'Animation' })}
        actions={
          <Button variant="ghost" size="icon-sm" type="button" onClick={handleAdd}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        }
      />

      {rows.map((row) => (
        <div key={row.id} className="space-y-1 bg-secondary/50 rounded p-1.5">
          <div className="flex items-center justify-between h-5">
            <span className="text-[11px] text-foreground">
              {t('animation.entry', { defaultValue: 'Animation' })}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              className="h-5 w-5"
              onClick={() => {
                const next = rows.filter((r) => r.id !== row.id);
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
                const list = rows.map((r) => (r.id === row.id ? { ...r, library: lib } : r));
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
                const list = rows.map((r) => (r.id === row.id ? { ...r, preset } : r));
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
        </div>
      ))}
    </div>
  );
}
