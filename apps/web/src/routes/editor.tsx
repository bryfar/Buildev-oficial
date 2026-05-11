import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import EditorLayout from '@/components/editor/editor-layout';
import { setPendingWorkspaceId } from '@/utils/pending-workspace-assignment';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useCanvasStore } from '../stores/canvas-store';
import { useUIKitStore } from '../stores/uikit-store';
import { useDocumentStore } from '../stores/document-store';
import { useAuthStore } from '../stores/auth-store';

export const Route = createFileRoute('/editor')({
  ssr: false,
  component: EditorPage,
  head: () => ({
    meta: [{ title: 'Buildev Editor' }],
  }),
});

function useOpenPanelIntentFromQuery() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const panel = params.get('panel');
    if (!panel) return;

    const canvas = useCanvasStore.getState();
    const uikit = useUIKitStore.getState();

    if (panel === 'code') {
      canvas.setCodePanelOpen(true);
      canvas.setRightPanelTab('code');
    } else if (panel === 'variables') {
      useCanvasStore.setState({ variablesPanelOpen: true });
    } else if (panel === 'design') {
      useCanvasStore.setState({ designMdPanelOpen: true });
    } else if (panel === 'uikit') {
      uikit.setBrowserOpen(true);
    }
  }, []);
}

function useCloudProjectLoader() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const siteId = params.get('siteId');
    if (!siteId) return;

    const auth = useAuthStore.getState();
    const docStore = useDocumentStore.getState();

    if (auth.isAuthenticated) {
       docStore.loadCloudDocument(siteId);
    }
  }, []);
}

function useWorkspaceIdFromQuery() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const workspaceId = params.get('workspaceId');
    if (!workspaceId) return;
    setPendingWorkspaceId(workspaceId);
    const u = new URL(window.location.href);
    u.searchParams.delete('workspaceId');
    window.history.replaceState(null, '', u.toString());
  }, []);
}

function EditorPage() {
  useKeyboardShortcuts();
  useBeforeUnload();
  useOpenPanelIntentFromQuery();
  useCloudProjectLoader();
  useWorkspaceIdFromQuery();

  return <EditorLayout />;
}
