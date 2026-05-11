import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { cssToHex } from '@/utils/css-to-hex';

declare global {
  interface Window {
    /** Guard so we only assign `MonacoEnvironment` once (monaco-editor also types this on Window). */
    __buildevMonacoEnv?: boolean;
  }
}

function ensureMonacoEnvironment() {
  if (typeof window === 'undefined' || window.__buildevMonacoEnv) return;
  window.__buildevMonacoEnv = true;
  window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      switch (label) {
        case 'json':
          return new JsonWorker();
        case 'css':
        case 'scss':
        case 'less':
          return new CssWorker();
        case 'html':
        case 'handlebars':
        case 'razor':
          return new HtmlWorker();
        case 'typescript':
        case 'javascript':
          return new TsWorker();
        default:
          return new EditorWorker();
      }
    },
  };
}

/** App theme: default is dark; `light` class on the root element enables light tokens. */
function isAppDarkMode(): boolean {
  if (typeof document === 'undefined') return true;
  return !document.documentElement.classList.contains('light');
}

function applyOpenpencilMonacoTheme(monaco: typeof import('monaco-editor')) {
  const dark = isAppDarkMode();
  const s = getComputedStyle(document.documentElement);
  const bg = cssToHex(s.getPropertyValue('--background')) ?? (dark ? '#252526' : '#fafafa');
  const fg = cssToHex(s.getPropertyValue('--foreground')) ?? (dark ? '#e4e4e7' : '#18181b');
  const muted = cssToHex(s.getPropertyValue('--muted')) ?? bg;
  const border = cssToHex(s.getPropertyValue('--border')) ?? (dark ? '#3f3f46' : '#e4e4e7');
  const mf = cssToHex(s.getPropertyValue('--muted-foreground')) ?? (dark ? '#a1a1aa' : '#71717a');
  const card = cssToHex(s.getPropertyValue('--card')) ?? bg;
  const primary = cssToHex(s.getPropertyValue('--primary')) ?? '#6366f1';

  const name = dark ? 'buildev-dark' : 'buildev-light';
  monaco.editor.defineTheme(name, {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': bg,
      'editor.foreground': fg,
      'editorLineNumber.foreground': mf,
      'editorLineNumber.activeForeground': fg,
      'editorCursor.foreground': fg,
      'editor.selectionBackground': dark ? `${primary}55` : `${primary}33`,
      'editor.inactiveSelectionBackground': dark ? `${muted}99` : `${muted}cc`,
      'scrollbarSlider.background': `${mf}44`,
      'scrollbarSlider.hoverBackground': `${mf}66`,
      'scrollbarSlider.activeBackground': `${mf}99`,
      'editor.lineHighlightBackground': dark ? `${muted}55` : `${muted}99`,
      'editorLineHighlight.border': '#00000000',
      'editorWidget.background': card,
      'editorWidget.border': border,
      'editorOverviewRuler.border': border,
      'minimap.background': '#00000000',
    },
  });
  monaco.editor.setTheme(name);
}

export type IdeEditorPaneProps = {
  /** Stable model URI (e.g. file URI for the virtual buffer). */
  modelPath: string;
  language: string;
  value: string;
  readOnly?: boolean;
  /** Full document text after edits (debounce in parent if needed). */
  onChange?: (value: string) => void;
  /** Fired when the caret moves (1-based line and column). */
  onCursorPositionChange?: (pos: { line: number; column: number }) => void;
};

function IdeEditorPane({
  modelPath,
  language,
  value,
  readOnly = false,
  onChange,
  onCursorPositionChange,
}: IdeEditorPaneProps) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onCursorRef = useRef(onCursorPositionChange);
  onCursorRef.current = onCursorPositionChange;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const editorRef = useRef<
    import('monaco-editor').editor.IStandaloneCodeEditor | undefined
  >(undefined);
  const [monacoPhase, setMonacoPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [monacoErrorMessage, setMonacoErrorMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    ensureMonacoEnvironment();
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let offTheme: (() => void) | undefined;

    setMonacoPhase('loading');
    setMonacoErrorMessage(null);

    void import('monaco-editor')
      .then((monaco) => {
        if (cancelled || !hostRef.current) return;

        const uri = monaco.Uri.parse(modelPath);
        const initial = valueRef.current;
        let model = monaco.editor.getModel(uri);
        if (!model) {
          model = monaco.editor.createModel(initial, language, uri);
        } else {
          model.setValue(initial);
          monaco.editor.setModelLanguage(model, language);
        }

        if (cancelled || !hostRef.current) {
          model.dispose();
          return;
        }

        applyOpenpencilMonacoTheme(monaco);

        const ed = monaco.editor.create(host, {
          model,
          theme: isAppDarkMode() ? 'buildev-dark' : 'buildev-light',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 8, bottom: 8 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          readOnly: readOnlyRef.current,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        });
        editorRef.current = ed;
        const emitCursor = () => {
          const p = ed.getPosition();
          const cb = onCursorRef.current;
          if (p && cb) cb({ line: p.lineNumber, column: p.column });
        };
        ed.onDidChangeCursorPosition(emitCursor);
        emitCursor();
        ed.onDidChangeModelContent(() => {
          const cb = onChangeRef.current;
          if (cb && !readOnlyRef.current) cb(ed.getValue());
        });
        requestAnimationFrame(() => {
          if (!cancelled) ed.layout();
        });
        setMonacoPhase('ready');

        const syncTheme = () => applyOpenpencilMonacoTheme(monaco);
        const obs = new MutationObserver(syncTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        offTheme = () => obs.disconnect();
      })
      .catch((err: unknown) => {
        console.error('[IdeEditorPane] Failed to load monaco-editor', err);
        if (cancelled) return;
        setMonacoErrorMessage(err instanceof Error ? err.message : String(err));
        setMonacoPhase('error');
      });

    return () => {
      cancelled = true;
      offTheme?.();
      const ed = editorRef.current;
      editorRef.current = undefined;
      if (ed) {
        const model = ed.getModel();
        ed.dispose();
        model?.dispose();
      }
    };
  }, [language, modelPath]);

  useEffect(() => {
    const ed = editorRef.current;
    if (ed) ed.updateOptions({ readOnly });
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  useEffect(() => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!model || model.getValue() === value) return;
    model.setValue(value);
  }, [value]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-x border-b border-border bg-background">
      <div
        ref={hostRef}
        className="min-h-0 min-w-0 flex-1 w-full"
        role="textbox"
        aria-multiline="true"
        aria-label={t('topbar.ideEditorDocument', { defaultValue: 'Document buffer' })}
      />
      {monacoPhase === 'loading' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
          {t('topbar.ideMonacoLoading', { defaultValue: 'Starting code editor…' })}
        </div>
      ) : null}
      {monacoPhase === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-destructive/5 px-4 text-center text-xs text-destructive">
          <span className="font-medium text-foreground">
            {t('topbar.ideMonacoErrorTitle', { defaultValue: 'Code editor failed to load' })}
          </span>
          {monacoErrorMessage ? (
            <span className="max-w-md break-words text-muted-foreground">{monacoErrorMessage}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(IdeEditorPane);
