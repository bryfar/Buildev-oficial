import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Link2, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDocumentStore } from '@/stores/document-store';
import { usePresenceStore } from '@/stores/presence-store';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Stable fingerprint of remote users for this dialog (name/color only; ignores cursor telemetry). */
function selectRemoteUsersFingerprint(s: { remoteUsers: Map<string, { id: string; name: string; color: string }> }) {
  const parts: string[] = [];
  for (const [id, u] of s.remoteUsers) {
    parts.push(`${id}:${u.name}:${u.color}`);
  }
  parts.sort();
  return parts.join('|');
}

export default function ShareDialog({ open, onClose }: ShareDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const inviteInputRef = useRef<HTMLInputElement>(null);

  const fileName = useDocumentStore((s) => s.fileName) || t('common.untitled');
  const remoteUsersFingerprint = usePresenceStore(selectRemoteUsersFingerprint);
  const remoteUsers = useMemo(() => {
    const map = usePresenceStore.getState().remoteUsers;
    return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
  }, [remoteUsersFingerprint]);

  const localUser = usePresenceStore((s) => s.localUser);
  const setLocalUser = usePresenceStore((s) => s.setLocalUser);

  const editorUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inviteInputRef.current?.focus());
  }, [open]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [editorUrl]);

  if (!open) return null;

  const titleId = 'share-dialog-title';
  const descId = 'share-dialog-description';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'relative bg-card rounded-lg border border-border shadow-xl overflow-hidden flex flex-col',
          'w-[min(440px,calc(100vw-2rem))] max-h-[min(560px,calc(100vh-2rem))]',
        )}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 shrink-0">
          <div className="min-w-0 flex items-start gap-2.5">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground"
              aria-hidden
            >
              <Users size={14} />
            </div>
            <div className="min-w-0">
              <h3 id={titleId} className="text-sm font-medium text-foreground">
                {t('share.title')}
              </h3>
              <p className="truncate text-xs text-muted-foreground">{fileName}</p>
              <p id={descId} className="sr-only">
                {t('share.editorLinkHint')}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="shrink-0 rounded-lg"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          <div>
            <label htmlFor="share-invite-input" className="text-xs text-muted-foreground block mb-1.5">
              {t('share.copyLiveInvite')}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                ref={inviteInputRef}
                id="share-invite-input"
                type="text"
                placeholder={t('share.inviteFieldPlaceholder', {
                  defaultValue: 'Email, names, or groups',
                })}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inviteEmail.trim()) void handleCopyLink();
                }}
                className="flex-1 min-w-0 bg-secondary border border-input rounded-md px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                autoComplete="off"
                aria-describedby="share-invite-hint"
              />
              <Button
                type="button"
                size="sm"
                disabled={!inviteEmail.trim()}
                onClick={handleCopyLink}
                aria-label={`${t('share.copy')}, ${t('share.editorLink')}`}
              >
                {t('share.inviteAction', { defaultValue: 'Invite' })}
              </Button>
            </div>
            <p id="share-invite-hint" className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {t('share.editorLinkHint')}
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">{t('share.liveMergeNote')}</p>
          </div>

          <div>
            <span className="text-xs text-muted-foreground block mb-1.5">
              {t('share.peopleInSession', { defaultValue: 'People in this session' })}
            </span>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 rounded-md border border-border/80 bg-secondary/20 p-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: localUser.color }}
                  aria-hidden
                >
                  {(localUser.name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {localUser.name}{' '}
                    <span className="font-normal text-muted-foreground">(you)</span>
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="share-display-name" className="text-xs text-muted-foreground block mb-1">
                  {t('common.name')}
                </label>
                <input
                  id="share-display-name"
                  type="text"
                  value={localUser.name}
                  onChange={(e) => setLocalUser({ ...localUser, name: e.target.value || 'Anonymous' })}
                  className="w-full bg-secondary border border-input rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={t('common.name')}
                  autoComplete="nickname"
                />
              </div>

              <Separator className="bg-border/60" />

              {remoteUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background text-xs font-medium text-white shadow-sm"
                    style={{ backgroundColor: user.color }}
                    aria-hidden
                  >
                    {(user.name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t('share.remotePresenceStatus', { defaultValue: 'Connected' })}
                    </p>
                  </div>
                </div>
              ))}

              {remoteUsers.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-3 leading-relaxed">
                  {t('share.noOtherCollaborators', {
                    defaultValue: 'No other collaborators are connected right now.',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-secondary/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleCopyLink}
            aria-label={
              copied ? t('share.copied') : `${t('share.copy')}, ${t('share.editorLink')}`
            }
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600 dark:text-emerald-500 shrink-0" aria-hidden />
                <span className="text-emerald-600 dark:text-emerald-500">{t('share.copied')}</span>
              </>
            ) : (
              <>
                <Link2 size={14} className="text-muted-foreground shrink-0" aria-hidden />
                {t('share.copy')}
              </>
            )}
          </Button>

          <div
            className="flex items-center gap-2 text-[11px] text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <span className="font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-500/90">
              {t('share.liveSessionBadge', { defaultValue: 'Live session' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
