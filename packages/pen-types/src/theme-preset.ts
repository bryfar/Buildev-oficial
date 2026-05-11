import type { VariableDefinition } from './variables.js';

export interface ThemePreset {
  id: string;
  name: string;
  themes: Record<string, string[]>;
  variables: Record<string, VariableDefinition>;
  createdAt: number;
}

/** `openpencil-theme-preset` is accepted when loading legacy preset files. */
export type ThemePresetFileType = 'buildev-theme-preset' | 'openpencil-theme-preset';

export interface ThemePresetFile {
  type: ThemePresetFileType;
  version: '1.0.0';
  name: string;
  themes: Record<string, string[]>;
  variables: Record<string, VariableDefinition>;
}
