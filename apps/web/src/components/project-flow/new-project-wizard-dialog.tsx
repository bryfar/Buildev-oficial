import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Figma, Github, ImageIcon, LayoutGrid, Sparkles, X } from 'lucide-react';
import type {
  CmsProviderId,
  ProjectBackendStack,
  ProjectCreationMode,
  ProjectStack,
  ProjectType,
} from '@/types/pen';
import { useProjectFlowStore } from '@/stores/project-flow-store';
import { useCanvasStore } from '@/stores/canvas-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { confirmUnsavedChanges } from '@/hooks/use-electron-menu';
import { isElectron, openDocument, openDocumentFS, supportsFileSystemAccess } from '@/utils/file-operations';
import { parseAndPrepareImportedDocument } from '@/utils/import-pen-document';
import { useDocumentStore } from '@/stores/document-store';

const stackOptions: Array<{ value: ProjectStack; labelKey: string }> = [
  { value: 'react', labelKey: 'projectFlow.stackOption.react' },
  { value: 'vue', labelKey: 'projectFlow.stackOption.vue' },
  { value: 'astro', labelKey: 'projectFlow.stackOption.astro' },
];

const backendOptions: Array<{ value: ProjectBackendStack }> = [
  { value: 'static' },
  { value: 'nodejs' },
  { value: 'serverless' },
  { value: 'edge' },
];

const cmsProviderOptions: Array<{ value: CmsProviderId }> = [
  { value: 'decap' },
  { value: 'sanity' },
  { value: 'contentful' },
  { value: 'strapi' },
  { value: 'payload' },
  { value: 'wordpress' },
  { value: 'custom' },
];

const typeOptions: Array<{ value: ProjectType }> = [
  { value: 'landing' },
  { value: 'multisite' },
  { value: 'cms' },
];

const templateOptionsByType: Record<ProjectType, Array<{ value: string; label: string }>> = {
  landing: [
    { value: 'landing-hero', label: 'Hero + Features' },
    { value: 'landing-product', label: 'Product Marketing' },
    { value: 'landing-startup', label: 'Startup SaaS' },
  ],
  multisite: [
    { value: 'multisite-starter', label: 'Home/About/Contact' },
    { value: 'multisite-company', label: 'Company Website' },
    { value: 'multisite-docs', label: 'Docs + Marketing' },
  ],
  cms: [
    { value: 'cms-editorial', label: 'Editorial Magazine' },
    { value: 'cms-blog', label: 'Blog + Categories' },
    { value: 'cms-content-team', label: 'Content Team Workspace' },
  ],
};

export type ArchitectChoice = 'ai' | 'figma' | 'reverse' | 'import_json' | 'normal';

interface NewProjectWizardDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Runs after `createProject` succeeds. Should close the wizard UI and navigate to `/editor`
   * (SPA) so the new in-memory document is not lost. Prefer passing this from the host route.
   */
  onProjectCreated?: () => void;
  /** When opening from the dashboard create menu, apply after reset and optionally skip step 0. */
  launchPreset?: { choice: ArchitectChoice; skipArchitectStep: boolean } | null;
  onLaunchPresetConsumed?: () => void;
}

export function NewProjectWizardDialog({
  open,
  onClose,
  onProjectCreated,
  launchPreset = null,
  onLaunchPresetConsumed,
}: NewProjectWizardDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const createProject = useProjectFlowStore((s) => s.createProject);
  const resolvePolicy = useProjectFlowStore((s) => s.resolvePolicy);

  const [step, setStep] = useState(0);
  const [architectChoice, setArchitectChoice] = useState<ArchitectChoice>('ai');
  const [projectName, setProjectName] = useState('');
  const [creationMode, setCreationMode] = useState<ProjectCreationMode>('ai');
  const [projectType, setProjectType] = useState<ProjectType>('landing');
  const [stack, setStack] = useState<ProjectStack>('react');
  const [backendStack, setBackendStack] = useState<ProjectBackendStack>('static');
  const [cmsProvider, setCmsProvider] = useState<CmsProviderId>('decap');
  const [cmsIntegration, setCmsIntegration] = useState<'none' | CmsProviderId>('none');
  const [templatePreset, setTemplatePreset] = useState('landing-hero');

  const totalSteps = 3;

  const resetForm = useCallback(() => {
    setStep(0);
    setArchitectChoice('ai');
    setProjectName('');
    setCreationMode('ai');
    setProjectType('landing');
    setStack('react');
    setBackendStack('static');
    setCmsProvider('decap');
    setCmsIntegration('none');
    setTemplatePreset('landing-hero');
  }, []);

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || !launchPreset) return;
    const { choice, skipArchitectStep } = launchPreset;
    setArchitectChoice(choice);
    const modeMap: Record<ArchitectChoice, ProjectCreationMode> = {
      ai: 'ai',
      figma: 'figma',
      reverse: 'reverse',
      import_json: 'normal',
      normal: 'normal',
    };
    setCreationMode(modeMap[choice]);
    if (skipArchitectStep && choice !== 'figma' && choice !== 'import_json') {
      setStep(1);
    }
    onLaunchPresetConsumed?.();
  }, [open, launchPreset, onLaunchPresetConsumed]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const effectiveProjectType = useMemo((): ProjectType => {
    if (cmsIntegration !== 'none') return 'cms';
    return projectType;
  }, [cmsIntegration, projectType]);

  const effectiveCmsProvider = useMemo((): CmsProviderId | undefined => {
    if (cmsIntegration !== 'none') return cmsIntegration;
    if (projectType === 'cms') return cmsProvider;
    return undefined;
  }, [cmsIntegration, projectType, cmsProvider]);

  const computedPolicy = useMemo(
    () => resolvePolicy(effectiveProjectType, stack, templatePreset),
    [effectiveProjectType, resolvePolicy, stack, templatePreset],
  );
  const stackLocked = Boolean(computedPolicy.forcedStack);
  const availableTemplates = templateOptionsByType[effectiveProjectType];

  const handleImportJson = useCallback(async () => {
    if (!(await confirmUnsavedChanges())) return;
    const go = () => void router.navigate({ to: '/editor', replace: true });
    if (isElectron()) {
      window.electronAPI!.openFile().then((result) => {
        if (!result) return;
        try {
          const name = result.filePath.split(/[/\\]/).pop() || 'untitled.op';
          const prepared = parseAndPrepareImportedDocument(result.content, {
            fileName: name,
            filePath: result.filePath,
          });
          if (!prepared) return;
          useDocumentStore.getState().loadDocument(prepared.doc, name, null, result.filePath);
          go();
        } catch {
          /* invalid */
        }
      });
      return;
    }
    if (supportsFileSystemAccess()) {
      openDocumentFS().then((result) => {
        if (result) {
          useDocumentStore.getState().loadDocument(result.doc, result.fileName, result.handle);
          go();
        }
      });
      return;
    }
    openDocument().then((result) => {
      if (result) {
        useDocumentStore.getState().loadDocument(result.doc, result.fileName);
        go();
      }
    });
  }, [router]);

  const handleArchitectContinue = () => {
    if (architectChoice === 'figma') {
      onClose();
      void router.navigate({ to: '/editor', replace: true });
      queueMicrotask(() => {
        requestAnimationFrame(() => useCanvasStore.getState().setFigmaImportDialogOpen(true));
      });
      return;
    }
    if (architectChoice === 'import_json') {
      onClose();
      void handleImportJson();
      return;
    }
    const modeMap: Record<ArchitectChoice, ProjectCreationMode> = {
      ai: 'ai',
      figma: 'figma',
      reverse: 'reverse',
      import_json: 'normal',
      normal: 'normal',
    };
    setCreationMode(modeMap[architectChoice]);
    setStep(1);
  };

  const handleFormContinue = (e: FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleCreate = () => {
    const pt = effectiveProjectType;
    const cp = pt === 'cms' ? effectiveCmsProvider ?? 'decap' : undefined;
    let st = stack;
    if (pt === 'cms') st = 'astro';
    createProject({
      projectName: projectName.trim() || 'Untitled Project',
      creationMode,
      projectType: pt,
      stack: st,
      templatePreset,
      backendStack,
      cmsProvider: cp,
    });
    if (onProjectCreated) {
      onProjectCreated();
      return;
    }
    onClose();
    void router.navigate({ to: '/editor', replace: true });
  };

  if (!open) return null;

  const architectCards: Array<{
    id: ArchitectChoice;
    icon: ReactNode;
    recommended?: boolean;
  }> = [
    { id: 'ai', icon: <Sparkles size={22} />, recommended: true },
    { id: 'figma', icon: <Figma size={22} /> },
    { id: 'reverse', icon: <ImageIcon size={22} /> },
    { id: 'import_json', icon: <Github size={22} /> },
    { id: 'normal', icon: <LayoutGrid size={22} /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-wizard-title"
        className="relative z-[101] flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <h2 id="new-project-wizard-title" className="text-lg font-semibold tracking-tight">
              {step === 0
                ? t('projectFlow.wizardModal.architectTitle')
                : step === 1
                  ? t('projectFlow.wizardModal.createTitle')
                  : t('projectFlow.wizardModal.reviewTitle')}
            </h2>
            {step === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{t('projectFlow.wizardModal.architectSubtitle')}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {t('projectFlow.wizardModal.stepOf', { current: step + 1, total: totalSteps })}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
              {architectCards.map((card) => (
                <div key={card.id} className="relative shrink-0 w-[140px] sm:w-[150px]">
                  {card.recommended ? (
                    <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-primary/90 to-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground shadow">
                      {t('projectFlow.wizardModal.recommended')}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setArchitectChoice(card.id)}
                    className={cn(
                      'flex h-full min-h-[168px] w-full flex-col items-center rounded-xl border bg-muted/20 p-3 text-center transition',
                      architectChoice === card.id
                        ? 'border-primary ring-1 ring-primary/40'
                        : 'border-border/80 hover:bg-muted/50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl',
                        architectChoice === card.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {card.icon}
                    </div>
                    <span className="mt-3 text-sm font-medium leading-tight">
                      {t(`projectFlow.wizardModal.architect.${card.id}.title`)}
                    </span>
                    <span className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {t(`projectFlow.wizardModal.architect.${card.id}.description`)}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <form id="create-project-form" onSubmit={handleFormContinue} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('projectFlow.newProject.projectName')}
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus-visible:ring-2"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={t('projectFlow.wizardModal.projectNameExample')}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('projectFlow.newProject.projectType')}
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  value={projectType}
                  onChange={(e) => {
                    const v = e.target.value as ProjectType;
                    setProjectType(v);
                    setTemplatePreset(templateOptionsByType[v][0].value);
                    if (v === 'cms') {
                      setStack('astro');
                      if (cmsIntegration === 'none') setCmsProvider('decap');
                    } else {
                      setCmsIntegration('none');
                    }
                  }}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`projectFlow.type.${opt.value}.label`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('projectFlow.newProject.frontendStack')}
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-60"
                  value={computedPolicy.stack}
                  onChange={(e) => setStack(e.target.value as ProjectStack)}
                  disabled={stackLocked}
                >
                  {stackOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
                {stackLocked ? (
                  <p className="text-xs text-muted-foreground">{t('projectFlow.newProject.policyAppliedCms', { stack: 'Astro' })}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('projectFlow.newProject.backendStack')}
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  value={backendStack}
                  onChange={(e) => setBackendStack(e.target.value as ProjectBackendStack)}
                >
                  {backendOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`projectFlow.backend.${opt.value}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('projectFlow.wizardModal.cmsIntegration')}
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  value={cmsIntegration === 'none' ? 'none' : cmsIntegration}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'none') {
                      setCmsIntegration('none');
                      if (projectType === 'cms') setProjectType('landing');
                    } else {
                      setCmsIntegration(v as CmsProviderId);
                      setProjectType('cms');
                      setStack('astro');
                    }
                  }}
                >
                  <option value="none">{t('projectFlow.wizardModal.cmsNone')}</option>
                  {cmsProviderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`projectFlow.cmsProvider.${opt.value}`)}
                    </option>
                  ))}
                </select>
              </div>

              {projectType === 'cms' && cmsIntegration === 'none' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('projectFlow.newProject.cmsProvider')}
                  </label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    value={cmsProvider}
                    onChange={(e) => setCmsProvider(e.target.value as CmsProviderId)}
                  >
                    {cmsProviderOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`projectFlow.cmsProvider.${opt.value}`)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('projectFlow.newProject.templatePreset')}
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  value={templatePreset}
                  onChange={(e) => setTemplatePreset(e.target.value)}
                >
                  {availableTemplates.map((tpl) => (
                    <option key={tpl.value} value={tpl.value}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
                {t('projectFlow.newProject.policyLine', {
                  mode: creationMode,
                  type: effectiveProjectType,
                  stack: computedPolicy.stack,
                  dashboard: computedPolicy.dashboardMode,
                  template: computedPolicy.templatePreset,
                })}
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('projectFlow.newProject.policyTitle')}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{t('projectFlow.wizardModal.reviewSubtitle')}</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-1 shadow-sm">
                <dl className="divide-y divide-border/60 rounded-lg bg-card/40 px-3 py-1 sm:px-4">
                  {[
                    {
                      key: 'name',
                      label: t('projectFlow.wizardModal.reviewName'),
                      value: projectName.trim() || t('common.untitled'),
                    },
                    {
                      key: 'type',
                      label: t('projectFlow.newProject.projectType'),
                      value: t(`projectFlow.type.${effectiveProjectType}.label`),
                    },
                    {
                      key: 'stack',
                      label: t('projectFlow.newProject.frontendStack'),
                      value: (() => {
                        const so = stackOptions.find((o) => o.value === computedPolicy.stack);
                        return so ? t(so.labelKey) : computedPolicy.stack;
                      })(),
                    },
                    {
                      key: 'backend',
                      label: t('projectFlow.newProject.backendStack'),
                      value: t(`projectFlow.backend.${backendStack}`),
                    },
                    ...(effectiveProjectType === 'cms' && effectiveCmsProvider
                      ? [
                          {
                            key: 'cms',
                            label: t('projectFlow.newProject.cmsProvider'),
                            value: t(`projectFlow.cmsProvider.${effectiveCmsProvider}`),
                          },
                        ]
                      : []),
                    {
                      key: 'template',
                      label: t('projectFlow.newProject.templatePreset'),
                      value:
                        availableTemplates.find((tpl) => tpl.value === templatePreset)?.label ?? templatePreset,
                    },
                  ].map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start sm:gap-6 sm:py-3"
                    >
                      <dt className="text-xs font-medium leading-snug text-muted-foreground">{row.label}</dt>
                      <dd className="text-sm font-semibold leading-snug text-foreground sm:text-right">
                        <span className="block break-words sm:ml-auto sm:max-w-full">{row.value}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('projectFlow.wizardModal.cancel')}
          </Button>
          {step === 0 ? (
            <Button type="button" onClick={handleArchitectContinue}>
              {t('projectFlow.wizardModal.continue')}
            </Button>
          ) : step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                {t('projectFlow.wizard.back')}
              </Button>
              <Button type="submit" form="create-project-form">
                {t('projectFlow.wizard.next')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                {t('projectFlow.wizard.back')}
              </Button>
              <Button type="button" onClick={handleCreate}>
                {t('projectFlow.wizard.createProject')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
