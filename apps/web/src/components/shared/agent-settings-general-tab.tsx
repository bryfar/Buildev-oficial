import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  apiBaseFromEnv,
  getApiBaseOverride,
  getEffectiveApiBase,
  normalizeUserApiBaseInput,
  setApiBaseOverride,
} from '@/utils/api-base';
import { initAppStorage } from '@/utils/app-storage';
import { useAuthStore } from '@/stores/auth-store';
import { useAgentSettingsStore } from '@/stores/agent-settings-store';

export function AgentSettingsGeneralTab() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useAppTheme();
  const dialogOpen = useAgentSettingsStore((s) => s.dialogOpen);
  const dialogTab = useAgentSettingsStore((s) => s.dialogTab);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const logout = useAuthStore((s) => s.logout);
  const startGitHubLogin = useAuthStore((s) => s.startGitHubLogin);

  const [revision, setRevision] = useState(0);
  const [apiDraft, setApiDraft] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    void initAppStorage().then(() => {
      setApiDraft(getApiBaseOverride() || '');
      setRevision((r) => r + 1);
    });
  }, []);

  const effectiveBase = useMemo(() => {
    void revision;
    return getEffectiveApiBase();
  }, [revision]);

  useEffect(() => {
    if (!dialogOpen || dialogTab !== 'general') return;
    if (token && getEffectiveApiBase()) {
      void checkAuth();
    }
  }, [dialogOpen, dialogTab, token, checkAuth, revision]);

  const saveApiDraft = useCallback(() => {
    setApiError(null);
    const normalized = normalizeUserApiBaseInput(apiDraft);
    if (!normalized) {
      setApiError(t('settings.apiBaseInvalid'));
      return;
    }
    setApiBaseOverride(normalized);
    setApiDraft(normalized);
    setRevision((r) => r + 1);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2500);
    const tok = useAuthStore.getState().token;
    if (tok) void useAuthStore.getState().checkAuth();
  }, [apiDraft, t]);

  const clearApiOverride = useCallback(() => {
    setApiError(null);
    setApiBaseOverride('');
    setApiDraft('');
    setRevision((r) => r + 1);
  }, []);

  const hasEnvUrl = Boolean(apiBaseFromEnv);
  const savedOverride = Boolean(!apiBaseFromEnv && getApiBaseOverride());

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-[15px] font-semibold text-foreground">{t('settings.general')}</h3>
        <p className="text-[12px] leading-snug text-muted-foreground">{t('settings.generalDescription')}</p>
      </div>

      <div className="rounded-lg border border-border bg-secondary/20 px-3.5 py-2.5">
        <p className="text-[13px] font-medium text-foreground">{t('projectFlow.shell.settingsAppearance')}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t('projectFlow.shell.settingsThemeDescription')}</p>
        <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={toggleTheme}>
          {theme === 'dark' ? t('projectFlow.shell.themeLight') : t('projectFlow.shell.themeDark')}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-secondary/20 px-3.5 py-2.5">
        <p className="text-[13px] font-medium text-foreground">{t('settings.apiBaseOverrideTitle')}</p>
        {hasEnvUrl ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t('settings.apiBaseFromEnv')}</p>
        ) : (
          <>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t('settings.apiBaseOverrideDescription')}
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="url"
                value={apiDraft}
                onChange={(e) => {
                  setApiDraft(e.target.value);
                  setApiError(null);
                }}
                placeholder={t('settings.apiBaseOverridePlaceholder')}
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 text-xs outline-none ring-primary/25 focus-visible:ring-2"
                autoComplete="off"
              />
              <div className="flex shrink-0 gap-2">
                <Button type="button" size="sm" className="h-8 text-xs" onClick={saveApiDraft}>
                  {t('settings.apiBaseOverrideSave')}
                </Button>
                {savedOverride ? (
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={clearApiOverride}>
                    {t('settings.apiBaseOverrideClear')}
                  </Button>
                ) : null}
              </div>
            </div>
            {apiError ? <p className="mt-1.5 text-[11px] text-destructive">{apiError}</p> : null}
            {savedFlash ? (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">{t('settings.apiBaseOverrideSaved')}</p>
            ) : null}
            {savedOverride && !savedFlash ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t('settings.apiBaseOverrideActive')}</p>
            ) : null}
          </>
        )}
      </div>

      <div className="rounded-lg border border-border bg-secondary/20 px-3.5 py-2.5">
        <p className="text-[13px] font-medium text-foreground">{t('projectFlow.shell.settingsGitHub')}</p>
        {!effectiveBase ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t('projectFlow.shell.settingsGitHubNoBackend')}
          </p>
        ) : authLoading ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{t('projectFlow.shell.settingsAuthChecking')}</p>
        ) : user?.email ? (
          <div className="mt-2 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              {t('projectFlow.shell.settingsGitHubSignedIn', { email: user.email })}
            </p>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => logout()}>
              {t('projectFlow.shell.settingsGitHubLogout')}
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => void startGitHubLogin()}
            >
              <Github className="h-3.5 w-3.5" aria-hidden />
              {t('projectFlow.shell.settingsGitHubConnect')}
            </Button>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">{t('projectFlow.shell.settingsServerEnvHint')}</p>
    </div>
  );
}
