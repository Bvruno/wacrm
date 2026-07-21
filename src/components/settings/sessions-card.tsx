'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  LogOut,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Globe,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

function getSessionIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return (decoded.sid as string) ?? null;
  } catch {
    return null;
  }
}

interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  refreshed_at: string | null;
  user_agent: string | null;
  ip: string | null;
  aal: string | null;
}

function parseDevice(ua: string | null): {
  icon: typeof Smartphone;
  label: string;
} {
  if (!ua) return { icon: Globe, label: 'Unknown device' };

  const lower = ua.toLowerCase();

  let os = 'Unknown OS';
  if (/android/.test(lower)) os = 'Android';
  else if (/iphone|ipad|ipod/.test(lower)) os = 'iOS';
  else if (/windows/.test(lower)) os = 'Windows';
  else if (/macintosh|mac os/.test(lower)) os = 'macOS';
  else if (/linux/.test(lower)) os = 'Linux';
  else if (/cros/.test(lower)) os = 'ChromeOS';

  let browser = '';
  if (/edg/.test(lower)) browser = 'Edge';
  else if (/firefox/.test(lower)) browser = 'Firefox';
  else if (/chrome/.test(lower) && !/edg/.test(lower)) browser = 'Chrome';
  else if (/safari/.test(lower) && !/chrome/.test(lower)) browser = 'Safari';
  else if (/opr/.test(lower)) browser = 'Opera';

  let icon = Monitor;
  if (/iphone|android.*mobile/.test(lower)) icon = Smartphone;
  else if (/ipad|tablet/.test(lower)) icon = Tablet;
  else if (/macintosh|windows/.test(lower)) icon = Laptop;

  const label = browser ? `${browser} on ${os}` : os;
  return { icon, label };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function SessionsCard() {
  const t = useTranslations('Settings.profile');
  const supabase = createClient();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalOpen, setGlobalOpen] = useState(false);
  const [signingOutGlobal, setSigningOutGlobal] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const sid = getSessionIdFromToken(session?.access_token);
      if (sid) setCurrentSessionId(sid);

      const res = await fetch('/api/sessions');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(
          body?.error ?? t('sessionsLoadFailed') ?? 'Failed to load sessions',
        );
        return;
      }

      const body = await res.json();
      const list: SessionRow[] = Array.isArray(body)
        ? body
        : body.sessions ?? [];
      setSessions(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [supabase, t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(
          body?.error ??
            t('signOutFailed', { message: 'Failed to revoke session' }),
        );
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success(t('sessionRevoked') ?? 'Session signed out');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setRevokingId(null);
    }
  };

  const signOutThisDevice = async () => {
    setRevokingId('__this__');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(t('signOutFailed', { message: error.message }));
        return;
      }
      window.location.href = '/login';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setRevokingId(null);
    }
  };

  const signOutAll = async () => {
    setSigningOutGlobal(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        toast.error(t('signOutFailed', { message: error.message }));
        return;
      }
      window.location.href = '/login';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setSigningOutGlobal(false);
    }
  };

  const SessionIcon = ({ icon }: { icon: typeof Smartphone }) => {
    const IconComponent = icon;
    return <IconComponent className="size-4 shrink-0 text-muted-foreground" />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <LogOut className="size-4 text-primary" />
            {t('sessionsTitle')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('sessionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              {t('noSessions') ?? 'No active sessions'}
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const { icon, label } = parseDevice(session.user_agent);
                const isCurrent = session.id === currentSessionId;
                const isRevoking = revokingId === session.id;

                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <SessionIcon icon={icon} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {label}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {t('currentSession') ?? 'Current'}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {session.ip && <span>IP: {session.ip}</span>}
                        <span>
                          {t('lastActive') ?? 'Active'}:{' '}
                          {formatDate(session.refreshed_at ?? session.updated_at)}
                        </span>
                        <span className="hidden sm:inline">
                          {t('created') ?? 'Created'}:{' '}
                          {formatDate(session.created_at)}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={isCurrent ? 'default' : 'ghost'}
                      size="sm"
                      disabled={isRevoking}
                      onClick={() =>
                        isCurrent ? signOutThisDevice() : revokeSession(session.id)
                      }
                    >
                      {isRevoking ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LogOut className="size-3.5" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">
                        {isCurrent
                          ? t('signOutThisDevice') ?? 'Sign out'
                          : t('signOut') ?? 'Sign out'}
                      </span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              type="button"
              variant="default"
              onClick={signOutThisDevice}
              disabled={revokingId === '__this__'}
              className="w-full sm:w-auto"
            >
              {revokingId === '__this__' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              {t('signOutThisDevice')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGlobalOpen(true)}
              className="w-full sm:w-auto"
            >
              <LogOut className="size-4" />
              {t('signOutAll')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={globalOpen} onOpenChange={setGlobalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('signOutConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('signOutConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setGlobalOpen(false)}
              disabled={signingOutGlobal}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={signOutAll}
              disabled={signingOutGlobal}
            >
              {signingOutGlobal ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('signingOut')}
                </>
              ) : (
                t('signOutEverywhere')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
