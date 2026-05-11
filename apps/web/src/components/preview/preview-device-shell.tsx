import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import type { PreviewDevicePreset } from '@/utils/preview-device-presets';

import 'devices.css/dist/devices.min.css';

type PreviewDeviceShellProps = {
  preset: PreviewDevicePreset;
  /** Uniform scale applied to the whole `.device` (fit viewport). */
  shellScale: number;
  iframeTitle: string;
  srcDoc: string;
  /** Logical iframe layout width (may differ from screen while fitting inside bezel). */
  contentWidth: number;
  contentHeight: number;
};

function deviceRootClassName(preset: PreviewDevicePreset): string {
  return cn('device', preset.devicesTypeClass, preset.devicesColorClasses);
}

export function PreviewDeviceShell({
  preset,
  shellScale,
  iframeTitle,
  srcDoc,
  contentWidth,
  contentHeight,
}: PreviewDeviceShellProps) {
  const { screenWidth, screenHeight, shellWidth, shellHeight } = preset;

  const contentScale = useMemo(() => {
    if (contentWidth <= 0 || contentHeight <= 0) return 1;
    return Math.min(screenWidth / contentWidth, screenHeight / contentHeight);
  }, [contentWidth, contentHeight, screenWidth, screenHeight]);

  const scaledBoxW = contentWidth * contentScale;
  const scaledBoxH = contentHeight * contentScale;

  return (
    <div
      className="pointer-events-none shrink-0"
      style={{
        width: shellWidth * shellScale,
        height: shellHeight * shellScale,
      }}
    >
      <div
        className={cn(deviceRootClassName(preset), 'pointer-events-auto origin-top-left')}
        style={{
          transform: `scale(${shellScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="device-frame">
          <div className={cn('device-screen relative overflow-hidden bg-black')}>
            <div
              className="absolute left-1/2 top-1/2 overflow-hidden bg-neutral-950"
              style={{
                width: scaledBoxW,
                height: scaledBoxH,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <iframe
                title={iframeTitle}
                srcDoc={srcDoc}
                className="absolute left-0 top-0 block border-0 bg-white dark:bg-neutral-950"
                style={{
                  width: contentWidth,
                  height: contentHeight,
                  transform: `scale(${contentScale})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
          </div>
        </div>
        <div className="device-stripe" />
        <div className="device-header" />
        <div className="device-sensors" />
        <div className="device-btns" />
        <div className="device-power" />
        <div className="device-home" />
      </div>
    </div>
  );
}
