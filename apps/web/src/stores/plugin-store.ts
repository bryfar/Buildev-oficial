import { create } from 'zustand';

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  capabilities: string[];
  enabled: boolean;
  isBuiltIn: boolean;
}

interface PluginState {
  plugins: PluginInfo[];
  activePluginId: string | null;
  isLoading: boolean;
  error: string | null;

  setPlugins: (plugins: PluginInfo[]) => void;
  togglePlugin: (id: string) => void;
  setActivePlugin: (id: string | null) => void;
  installPlugin: (plugin: PluginInfo) => void;
  uninstallPlugin: (id: string) => void;
  setError: (error: string | null) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  plugins: [],
  activePluginId: null,
  isLoading: false,
  error: null,

  setPlugins: (plugins) => set({ plugins }),

  togglePlugin: (id) => set((state) => ({
    plugins: state.plugins.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ),
  })),

  setActivePlugin: (id) => set({ activePluginId: id }),

  installPlugin: (plugin) => set((state) => ({
    plugins: [...state.plugins, { ...plugin, enabled: true, isBuiltIn: false }],
  })),

  uninstallPlugin: (id) => set((state) => ({
    plugins: state.plugins.filter((p) => p.id !== id),
    activePluginId: state.activePluginId === id ? null : state.activePluginId,
  })),

  setError: (error) => set({ error }),
}));

export const BUILT_IN_PLUGINS: PluginInfo[] = [
  {
    id: 'built-in-design-system',
    name: 'Design System',
    version: '1.0.0',
    description: 'Built-in design system with tokens and variables',
    capabilities: ['design-tokens', 'variables'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-codegen',
    name: 'Code Generator',
    version: '1.0.0',
    description: 'Multi-framework code generation (React, Vue, HTML, Flutter, SwiftUI)',
    capabilities: ['codegen', 'react', 'vue', 'html', 'flutter', 'swiftui'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-ai-skills',
    name: 'AI Skills',
    version: '1.0.0',
    description: 'AI prompt skills for design generation and style guides',
    capabilities: ['ai-generation', 'style-guides', 'orchestrator'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-uikit',
    name: 'UIKit',
    version: '1.0.0',
    description: 'Built-in component library and reusable design blocks',
    capabilities: ['components', 'presets', 'templates'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-vision',
    name: 'AI Vision Scanner',
    version: '1.0.0',
    description: 'Convert screenshots and mockups to editable designs',
    capabilities: ['vision-scan', 'image-to-design'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-code-sync',
    name: 'Code Sync',
    version: '1.0.0',
    description: 'Bidirectional code editing and canvas synchronization',
    capabilities: ['code-sync', 'auto-sync'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-preview',
    name: 'Preview Mode',
    version: '1.0.0',
    description: 'Device preview with responsive testing',
    capabilities: ['preview', 'responsive-test'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-git',
    name: 'Git Integration',
    version: '1.0.0',
    description: 'GitHub integration for version control and collaboration',
    capabilities: ['git', 'github-sync', 'branching'],
    enabled: true,
    isBuiltIn: true,
  },
  {
    id: 'built-in-mcp',
    name: 'MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol server for external AI agents',
    capabilities: ['mcp', 'agent-tools'],
    enabled: true,
    isBuiltIn: true,
  },
];