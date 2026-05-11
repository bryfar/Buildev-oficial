import { create } from 'zustand';
import type {
  CmsProviderId,
  ProjectBackendStack,
  ProjectCreationMode,
  ProjectMetadata,
  ProjectStack,
  ProjectType,
  ProjectTemplatePolicy,
} from '@/types/pen';
import { useDocumentStore } from '@/stores/document-store';
import { useCanvasStore } from '@/stores/canvas-store';

interface CreateProjectInput {
  projectName: string;
  creationMode: ProjectCreationMode;
  projectType: ProjectType;
  stack: ProjectStack;
  templatePreset: string;
  backendStack: ProjectBackendStack;
  cmsProvider?: CmsProviderId;
}

interface ProjectFlowState {
  createProject: (input: CreateProjectInput) => ProjectMetadata;
  resolvePolicy: (projectType: ProjectType, stack: ProjectStack, templatePreset: string) => ProjectTemplatePolicy;
}

function buildPolicy(
  projectType: ProjectType,
  stack: ProjectStack,
  templatePreset: string,
): ProjectTemplatePolicy {
  if (projectType === 'cms') {
    return {
      stack: 'astro',
      templatePreset: templatePreset || 'cms-editorial',
      dashboardMode: 'cms',
      forcedStack: true,
    };
  }
  if (projectType === 'multisite') {
    return {
      stack,
      templatePreset: templatePreset || 'multisite-starter',
      dashboardMode: 'site',
      forcedStack: false,
    };
  }
  return {
    stack,
    templatePreset: templatePreset || 'landing-hero',
    dashboardMode: 'page',
    forcedStack: false,
  };
}

export const useProjectFlowStore = create<ProjectFlowState>(() => ({
  resolvePolicy: (projectType, stack, templatePreset) => buildPolicy(projectType, stack, templatePreset),

  createProject: ({
    projectName,
    creationMode,
    projectType,
    stack,
    templatePreset,
    backendStack,
    cmsProvider,
  }) => {
    useDocumentStore.getState().newDocument();
    const policy = buildPolicy(projectType, stack, templatePreset);

    const metadata: ProjectMetadata = {
      creationMode,
      type: projectType,
      projectName: projectName.trim() || 'Untitled Project',
      policy,
      createdAt: new Date().toISOString(),
      backendStack,
      ...(projectType === 'cms' && cmsProvider ? { cmsProvider } : {}),
    };

    useDocumentStore.getState().setProjectMetadata(metadata);
    const initialPageId = useDocumentStore.getState().document.pages?.[0]?.id ?? null;
    if (initialPageId) {
      useDocumentStore.getState().renamePage(initialPageId, 'Home');
      useCanvasStore.getState().setActivePageId(initialPageId);
    }

    if (projectType === 'multisite') {
      const aboutPage = useDocumentStore.getState().addPage();
      useDocumentStore.getState().renamePage(aboutPage, 'About');
      const contactPage = useDocumentStore.getState().addPage();
      useDocumentStore.getState().renamePage(contactPage, 'Contact');
    }

    if (projectType === 'cms') {
      const blogPage = useDocumentStore.getState().addPage();
      useDocumentStore.getState().renamePage(blogPage, 'Blog');
      const articlePage = useDocumentStore.getState().addPage();
      useDocumentStore.getState().renamePage(articlePage, 'Article');
    }

    // Suggested .op name for Save / Save as and recents after first save (Ctrl+S now updates recents via store).
    const base = projectName.trim() || 'Untitled Project';
    const safe = base.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'Untitled Project';
    useDocumentStore.setState({ fileName: `${safe.slice(0, 200)}.op` });

    return metadata;
  },
}));
