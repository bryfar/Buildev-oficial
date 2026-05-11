/**
 * Preview device presets: maps each Buildev preset to a devices.css
 * (`devices.css` npm, MIT) device type class and known shell / screen sizes
 * from the library CSS so the host can scale the mockup and fit iframe content.
 */

export type PreviewDevicePresetId =
  | 'ios-iphone'
  | 'android-phone'
  | 'ipad'
  | 'macbook'
  | 'windows';

export type PreviewDevicePreset = {
  id: PreviewDevicePresetId;
  label: string;
  shortLabel: string;
  /** Logical viewport defaults (iframe layout size). */
  width: number;
  height: number;
  topBarLabel?: string;
  /** Second class on the root, e.g. `device-iphone-14-pro`. */
  devicesTypeClass: string;
  /** Optional color variant classes (devices.css), e.g. `device-spacegray`. */
  devicesColorClasses?: string;
  /** Outer `.device` box width in px (from devices.css). */
  shellWidth: number;
  shellHeight: number;
  /** Inner `.device-screen` content area in px. */
  screenWidth: number;
  screenHeight: number;
};

/** Shell and screen sizes match `node_modules/devices.css/dist/devices.css` v0.2.0. */
export const PREVIEW_DEVICE_PRESETS: readonly PreviewDevicePreset[] = [
  {
    id: 'ios-iphone',
    label: 'iOS · iPhone',
    shortLabel: 'iPhone',
    width: 390,
    height: 830,
    topBarLabel: 'iPhone 14 Pro',
    devicesTypeClass: 'device-iphone-14-pro',
    shellWidth: 428,
    shellHeight: 868,
    screenWidth: 390,
    screenHeight: 830,
  },
  {
    id: 'android-phone',
    label: 'Android · Phone',
    shortLabel: 'Android',
    width: 376,
    height: 816,
    topBarLabel: 'Pixel 6 Pro',
    devicesTypeClass: 'device-google-pixel-6-pro',
    devicesColorClasses: 'device-black',
    shellWidth: 404,
    shellHeight: 862,
    screenWidth: 376,
    screenHeight: 816,
  },
  {
    id: 'ipad',
    label: 'iOS · iPad',
    shortLabel: 'iPad',
    width: 506,
    height: 724,
    topBarLabel: 'iPad Pro',
    devicesTypeClass: 'device-ipad-pro',
    devicesColorClasses: 'device-spacegray',
    shellWidth: 560,
    shellHeight: 778,
    screenWidth: 506,
    screenHeight: 724,
  },
  {
    id: 'macbook',
    label: 'macOS · Mac',
    shortLabel: 'Mac',
    width: 576,
    height: 360,
    topBarLabel: 'MacBook',
    devicesTypeClass: 'device-macbook',
    devicesColorClasses: 'device-spacegray',
    shellWidth: 740,
    shellHeight: 432,
    screenWidth: 576,
    screenHeight: 360,
  },
  {
    id: 'windows',
    label: 'Windows · Laptop',
    shortLabel: 'Win',
    width: 540,
    height: 360,
    topBarLabel: 'Surface Book',
    devicesTypeClass: 'device-surface-book',
    shellWidth: 728,
    shellHeight: 424,
    screenWidth: 540,
    screenHeight: 360,
  },
] as const;

export function getPreviewDevicePreset(id: string): PreviewDevicePreset {
  const found = PREVIEW_DEVICE_PRESETS.find((p) => p.id === id);
  return found ?? PREVIEW_DEVICE_PRESETS[0]!;
}
