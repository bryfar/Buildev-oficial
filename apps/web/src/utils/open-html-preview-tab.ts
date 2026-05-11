import { syncCanvasPositionsToStore } from '@/canvas/skia-engine-ref';
import { useCanvasStore } from '@/stores/canvas-store';
import { useDocumentStore } from '@/stores/document-store';
import {
  persistPreviewPayloadForNewTab,
  type StoredPreviewPayloadV1,
} from '@/utils/preview-payload-key';
import { buildActivePagePreviewHtml } from '@/utils/preview-html';

function scheduleRevoke(url: string): void {
  const revoke = () => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };
  setTimeout(revoke, 120_000);
}

function openUrlInNewBlankTab(url: string): boolean {
  const w = window.open(url, '_blank');
  if (w) {
    try {
      w.opener = null;
    } catch {
      /* ignore */
    }
    return true;
  }
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}

function openBlobPreviewFallback(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  if (openUrlInNewBlankTab(url)) {
    scheduleRevoke(url);
    return;
  }
  URL.revokeObjectURL(url);
}

/**
 * Same intent as Buildev's `window.open('/preview/' + pageId, '_blank')`: opens a dedicated
 * preview route in a new tab. Document state is passed once via sessionStorage + localStorage
 * (new windows often do not share sessionStorage with the opener). Falls back to a blob URL if
 * storage is unavailable.
 */
export function openActivePageHtmlPreviewInNewTab(): void {
  try {
    syncCanvasPositionsToStore();
  } catch {
    /* canvas may be unavailable (e.g. route without Skia) */
  }

  const doc = useDocumentStore.getState().document;
  const activePageId = useCanvasStore.getState().activePageId;

  if (!activePageId) {
    return;
  }

  let html: string;
  try {
    html = buildActivePagePreviewHtml(doc, activePageId);
  } catch (err) {
    console.error('[openActivePageHtmlPreviewInNewTab] build HTML failed:', err);
    return;
  }

  const sessionId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const payload: StoredPreviewPayloadV1 = {
    v: 1,
    pageId: activePageId,
    document: doc,
    storedAt: Date.now(),
  };

  const sessionOk = persistPreviewPayloadForNewTab(sessionId, payload);
  if (!sessionOk) {
    console.warn('[openActivePageHtmlPreviewInNewTab] preview payload storage unavailable, using blob preview');
  }

  if (sessionOk) {
    const path = `/preview/${encodeURIComponent(activePageId)}?s=${encodeURIComponent(sessionId)}`;
    const url = new URL(path, window.location.origin).href;
    if (openUrlInNewBlankTab(url)) {
      return;
    }
  }

  openBlobPreviewFallback(html);
}
