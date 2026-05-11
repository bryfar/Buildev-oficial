import type { PenNode } from '@buildev/pen-types';

export type PluginPhase = 'before-create' | 'create' | 'after-create' | 'before-export' | 'export' | 'after-export';

export interface PluginCapability {
  name: string;
  version: string;
  description?: string;
}

export interface PluginHooks {
  onInitialize?: (context: PluginContext) => Promise<void> | void;
  onActivate?: (context: PluginContext) => Promise<void> | void;
  onDeactivate?: (context: PluginContext) => Promise<void> | void;
  onDispose?: (context: PluginContext) => Promise<void> | void;
  
  beforeGenerate?: (context: GenerateContext) => Promise<GenerateContext>;
  afterGenerate?: (context: GenerateContext) => Promise<void>;
  
  beforeExport?: (context: ExportContext) => Promise<ExportContext>;
  afterExport?: (context: ExportContext) => Promise<void>;
  
  beforeImport?: (context: ImportContext) => Promise<ImportContext>;
  afterImport?: (context: ImportContext) => Promise<void>;
}

export interface PluginContext {
  id: string;
  name: string;
  version: string;
  capabilities: PluginCapability[];
  config: Record<string, unknown>;
  getConfig: <T>(key: string, defaultValue?: T) => T | undefined;
  setConfig: <T>(key: string, value: T) => void;
  storage: Map<string, unknown>;
}

export interface GenerateContext {
  prompt: string;
  nodes: PenNode[];
  document: any;
  framework?: string;
  options?: Record<string, unknown>;
}

export interface ExportContext {
  nodes: PenNode[];
  framework: string;
  options?: Record<string, unknown>;
  output?: string;
}

export interface ImportContext {
  source: string;
  format: string;
  data: unknown;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  capabilities: PluginCapability[];
  dependencies?: Record<string, string>;
}

export interface Plugin extends PluginManifest {
  hooks: PluginHooks;
  context: PluginContext;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private eventHandlers: Map<PluginPhase, Set<(context: any) => Promise<any>>> = new Map();

  async register(manifest: PluginManifest, hooks: PluginHooks): Promise<Plugin> {
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already registered`);
    }

    const context: PluginContext = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      capabilities: manifest.capabilities,
      config: {},
      getConfig: function <T>(key: string, defaultValue?: T): T | undefined {
        return (this.config[key] as T) ?? defaultValue;
      },
      setConfig: function <T>(key: string, value: T): void {
        this.config[key] = value;
      },
      storage: new Map(),
    };

    const plugin: Plugin = {
      ...manifest,
      hooks,
      context,
    };

    if (hooks.onInitialize) {
      await hooks.onInitialize(context);
    }

    if (hooks.onActivate) {
      await hooks.onActivate(context);
    }

    this.plugins.set(manifest.id, plugin);
    console.log(`[PluginManager] Registered: ${manifest.name} v${manifest.version}`);

    return plugin;
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    if (plugin.hooks.onDeactivate) {
      await plugin.hooks.onDeactivate(plugin.context);
    }

    if (plugin.hooks.onDispose) {
      await plugin.hooks.onDispose(plugin.context);
    }

    this.plugins.delete(pluginId);
    console.log(`[PluginManager] Unregistered: ${pluginId}`);
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCapability(capability: string): Plugin[] {
    return this.getAllPlugins().filter((p) =>
      p.capabilities.some((c) => c.name === capability)
    );
  }

  on(phase: PluginPhase, handler: (context: any) => Promise<any>): void {
    if (!this.eventHandlers.has(phase)) {
      this.eventHandlers.set(phase, new Set());
    }
    this.eventHandlers.get(phase)!.add(handler);
  }

  off(phase: PluginPhase, handler: (context: any) => Promise<any>): void {
    this.eventHandlers.get(phase)?.delete(handler);
  }

  async executePhase<T extends PluginPhase>(
    phase: T,
    context: Parameters<NonNullable<PluginHooks[T]>>[0]
  ): Promise<any> {
    const handlers = this.eventHandlers.get(phase);
    if (!handlers) return context;

    let result = context;
    for (const handler of handlers) {
      result = await handler(result) ?? result;
    }

    for (const plugin of this.plugins.values()) {
      const hook = plugin.hooks[phase];
      if (hook) {
        result = await hook(result as any) ?? result;
      }
    }

    return result;
  }

  async beforeGenerate(prompt: string, nodes: PenNode[], document: any, framework?: string): Promise<GenerateContext> {
    const context: GenerateContext = { prompt, nodes, document, framework };
    return this.executePhase('before-generate', context) as Promise<GenerateContext>;
  }

  async afterGenerate(context: GenerateContext): Promise<void> {
    await this.executePhase('after-generate', context);
  }

  async beforeExport(nodes: PenNode[], framework: string, options?: Record<string, unknown>): Promise<ExportContext> {
    const context: ExportContext = { nodes, framework, options };
    return this.executePhase('before-export', context) as Promise<ExportContext>;
  }

  async afterExport(context: ExportContext): Promise<void> {
    await this.executePhase('after-export', context);
  }
}

export const pluginManager = new PluginManager();

export async function registerBuiltInPlugins(): Promise<void> {
  await pluginManager.register(
    {
      id: 'built-in-design-system',
      name: 'Design System',
      version: '1.0.0',
      description: 'Built-in design system with tokens and variables',
      capabilities: [
        { name: 'design-tokens', version: '1.0.0' },
        { name: 'variables', version: '1.0.0' },
      ],
    },
    {
      onInitialize: async () => {
        console.log('[Plugin] Design System initialized');
      },
    }
  );

  await pluginManager.register(
    {
      id: 'built-in-codegen',
      name: 'Code Generator',
      version: '1.0.0',
      description: 'Multi-framework code generation',
      capabilities: [
        { name: 'codegen', version: '1.0.0' },
        { name: 'react', version: '1.0.0' },
        { name: 'vue', version: '1.0.0' },
        { name: 'html', version: '1.0.0' },
      ],
    },
    {
      onInitialize: async () => {
        console.log('[Plugin] Code Generator initialized');
      },
    }
  );

  await pluginManager.register(
    {
      id: 'built-in-ai-skills',
      name: 'AI Skills',
      version: '1.0.0',
      description: 'AI prompt skills for design generation',
      capabilities: [
        { name: 'ai-generation', version: '1.0.0' },
        { name: 'style-guides', version: '1.0.0' },
      ],
    },
    {
      onInitialize: async () => {
        console.log('[Plugin] AI Skills initialized');
      },
    }
  );
}

export interface PluginStore {
  getState: () => {
    plugins: Plugin[];
    activePlugins: string[];
  };
  activatePlugin: (pluginId: string) => Promise<void>;
  deactivatePlugin: (pluginId: string) => Promise<void>;
}

export function createPluginStore() {
  const activePlugins = new Set<string>();

  return {
    getState: () => ({
      plugins: pluginManager.getAllPlugins(),
      activePlugins: Array.from(activePlugins),
    }),
    async activatePlugin(pluginId: string) {
      activePlugins.add(pluginId);
    },
    async deactivatePlugin(pluginId: string) {
      activePlugins.delete(pluginId);
    },
  };
}