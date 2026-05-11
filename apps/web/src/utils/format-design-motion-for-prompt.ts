import type { PenDesignMotionConfig } from '@buildev/pen-types';

/** Serialize document.designMotion for AI codegen prompts (metadata only). */
// TODO: Skia preview does not consume designMotion; add runtime mapping only if product needs live motion on canvas.
export function formatDesignMotionForPrompt(config: PenDesignMotionConfig | undefined): string {
  if (!config) return '';

  const lines: string[] = [];
  if (config.primaryLibrary && config.primaryLibrary !== 'none') {
    lines.push(`Primary animation stack: ${config.primaryLibrary}`);
    if (config.primaryPreset && config.primaryPreset !== 'none') {
      lines.push(`Primary preset: ${config.primaryPreset}`);
    }
  }

  const extras = config.extraAnimations ?? [];
  if (extras.length > 0) {
    lines.push('Additional animations:');
    for (const row of extras) {
      const label = row.label ? ` (${row.label})` : '';
      lines.push(`- ${row.library} / ${row.preset}${label}`);
    }
  }

  const fx = config.motionEffects ?? [];
  if (fx.length > 0) {
    lines.push('Motion effects:');
    for (const row of fx) {
      const id = row.kind === 'custom' && row.customId ? ` [${row.customId}]` : '';
      const label = row.label ? ` (${row.label})` : '';
      lines.push(`- ${row.kind}${id}${label}`);
    }
  }

  if (lines.length === 0) return '';

  return ['## Document motion preferences (from Design panel; implement when applicable)', ...lines].join(
    '\n',
  );
}
