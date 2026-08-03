'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';
import {
  launchEmbeddedSignup,
  EmbeddedSignupError,
} from '@/lib/whatsapp/embedded-signup';
import type { WhatsAppConfig as WhatsAppConfigType } from '@/types';

type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';
type ResetReason = 'token_corrupted' | 'meta_api_error' | null;

export function WhatsAppConfig() {
  const t = useTranslations('Settings.whatsapp');
  const supabase = createClient();
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfigType | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('unknown');
  const [resetReason, setResetReason] = useState<ResetReason>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const loadedAccountIdRef = useRef<string | null>(null);

  const isRegistered = Boolean(config?.registered_at);
  const lastRegistrationError = config?.last_registration_error ?? null;

  const [verifyingRegistration, setVerifyingRegistration] = useState(false);
  type RegistrationProbe = {
    live: boolean;
    checks: Record<string, boolean | null>;
    errors?: string[];
    last_registration_error?: string | null;
    registered_at?: string | null;
    subscribed_apps_at?: string | null;
  };
  const [registrationProbe, setRegistrationProbe] =
    useState<RegistrationProbe | null>(null);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '';

  const fetchConfig = useCallback(
    async (acctId: string) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('whatsapp_config')
          .select('*')
          .eq('account_id', acctId)
          .maybeSingle();

        if (error) {
          console.error('Failed to load config row:', error);
        }

        setConfig(data ?? null);
        setRegistrationProbe(null);

        if (data) {
          try {
            const res = await fetch('/api/whatsapp/config', { method: 'GET' });
            const payload = await res.json();

            if (payload.connected) {
              setConnectionStatus('connected');
              setResetReason(null);
              setStatusMessage('');
            } else {
              setConnectionStatus('disconnected');
              setResetReason(
                payload.needs_reset
                  ? 'token_corrupted'
                  : payload.reason === 'meta_api_error'
                    ? 'meta_api_error'
                    : null
              );
              setStatusMessage(payload.message || '');
            }
          } catch (err) {
            console.error('Health check failed:', err);
            setConnectionStatus('disconnected');
          }
        } else {
          setConnectionStatus('disconnected');
          setResetReason(null);
          setStatusMessage('');
        }
      } catch (err) {
        console.error('fetchConfig error:', err);
        toast.error('Failed to load WhatsApp configuration');
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      loadedAccountIdRef.current = null;
      setLoading(false);
      return;
    }
    if (loadedAccountIdRef.current === accountId) return;
    loadedAccountIdRef.current = accountId;
    fetchConfig(accountId);
  }, [authLoading, profileLoading, user?.id, accountId, fetchConfig]);

  async function handleConnect() {
    try {
      setConnecting(true);
      const signup = await launchEmbeddedSignup();

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: signup.code,
          phone_number_id: signup.phoneNumberId,
          waba_id: signup.wabaId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t('signupError'));
        return;
      }

      toast.success(
        data.phone_info?.verified_name
          ? t('connectedSuccess', { name: data.phone_info.verified_name })
          : t('connectedSuccessGeneric')
      );

      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      if (err instanceof EmbeddedSignupError && err.reason === 'cancelled') {
        toast.error(t('cancelMessage'));
      } else {
        console.error('Embedded Signup error:', err);
        toast.error(t('signupError'));
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus('connected');
        setResetReason(null);
        setStatusMessage('');
        toast.success(
          payload.phone_info?.verified_name
            ? `Connected to ${payload.phone_info.verified_name}`
            : 'API connection successful'
        );
      } else {
        setConnectionStatus('disconnected');
        setResetReason(
          payload.needs_reset
            ? 'token_corrupted'
            : payload.reason === 'meta_api_error'
              ? 'meta_api_error'
              : null
        );
        setStatusMessage(payload.message || '');
        toast.error(payload.message || 'API connection failed');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setConnectionStatus('disconnected');
      toast.error('Connection test failed. Check network and try again.');
    } finally {
      setTesting(false);
    }
  }

  async function handleVerifyRegistration() {
    setVerifyingRegistration(true);
    setRegistrationProbe(null);
    try {
      const res = await fetch('/api/whatsapp/config/verify-registration', {
        method: 'GET',
      });
      const data = (await res.json()) as RegistrationProbe;
      setRegistrationProbe(data);
      if (data.live) {
        toast.success('Number is fully wired — Meta is delivering events.');
      } else {
        toast.error(
          'Number is not fully registered. See the checks below for which step failed.',
          { duration: 8000 }
        );
      }
      if (accountId) await fetchConfig(accountId);
    } catch (err) {
      console.error('verify-registration failed:', err);
      toast.error('Could not reach the verification endpoint.');
    } finally {
      setVerifyingRegistration(false);
    }
  }

  async function handleReset() {
    if (
      !confirm(
        'This will delete the current WhatsApp config so you can reconnect. Continue?'
      )
    ) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset configuration');
        return;
      }

      toast.success('Configuration cleared. You can now reconnect.');
      setConfig(null);
      setConnectionStatus('disconnected');
      setResetReason(null);
      setStatusMessage('');
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset configuration');
    } finally {
      setResetting(false);
    }
  }

  function handleCopyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead title={t('title')} description={t('description')} />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary size-6 animate-spin" />
        </div>
      </section>
    );
  }

  const showResetBanner = resetReason === 'token_corrupted';

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead title={t('title')} description={t('description')} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {showResetBanner && (
            <Alert className="border-amber-600/40 bg-amber-950/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" />
                <div className="flex-1">
                  <AlertTitle className="mb-1 text-amber-200">
                    Stored token can&apos;t be decrypted
                  </AlertTitle>
                  <AlertDescription className="text-sm text-amber-100/80">
                    {statusMessage}
                  </AlertDescription>
                  <Button
                    onClick={handleReset}
                    disabled={resetting}
                    size="sm"
                    className="mt-3 bg-amber-600 text-white hover:bg-amber-700"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t('resetting')}
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-4" />
                        {t('resetConfig')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {/* Connection Status */}
          <Alert className="bg-card border-border">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <CheckCircle2 className="text-primary size-4" />
              ) : (
                <XCircle className="size-4 text-red-500" />
              )}
              <AlertTitle className="text-foreground mb-0">
                {connectionStatus === 'connected'
                  ? t('credentialsValid')
                  : t('notConnected')}
              </AlertTitle>
            </div>
            <AlertDescription className="text-muted-foreground">
              {connectionStatus === 'connected'
                ? t('connectedDesc')
                : statusMessage || t('notConnectedDesc')}
            </AlertDescription>
          </Alert>

          {config && (
            <Alert
              className={
                isRegistered
                  ? 'border-emerald-700/50 bg-emerald-950/30'
                  : 'border-amber-700/50 bg-amber-950/30'
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isRegistered ? (
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-400" />
                  )}
                  <AlertTitle
                    className={
                      'mb-0 ' +
                      (isRegistered ? 'text-emerald-200' : 'text-amber-200')
                    }
                  >
                    {isRegistered ? t('registered') : t('notRegistered')}
                  </AlertTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyRegistration}
                  disabled={verifyingRegistration}
                  className="border-border text-foreground hover:bg-muted h-7 bg-transparent"
                >
                  {verifyingRegistration ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                  {t('verifyWithMeta')}
                </Button>
              </div>
              <AlertDescription className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {isRegistered ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: t('subscribedSince', {
                        date: config.registered_at
                          ? new Date(config.registered_at).toLocaleString()
                          : t('unknownDate'),
                      }),
                    }}
                  />
                ) : lastRegistrationError ? (
                  <>
                    {t('lastAttemptFailed')}
                    <span className="text-red-300">
                      &quot;{lastRegistrationError}&quot;
                    </span>
                    . {t('retryHint')}
                  </>
                ) : (
                  <>{t('noRegistrationHint')}</>
                )}
              </AlertDescription>

              {registrationProbe && (
                <div className="border-border bg-card/60 mt-3 space-y-1.5 rounded border px-3 py-2 text-[11px]">
                  <p className="text-foreground font-medium">
                    {t('diagnosticLastRun')}
                    <span
                      className={
                        registrationProbe.live
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }
                    >
                      {registrationProbe.live ? t('live') : t('notLive')}
                    </span>
                  </p>
                  <ul className="text-muted-foreground space-y-0.5">
                    {Object.entries(registrationProbe.checks).map(([k, v]) => (
                      <li key={k} className="flex items-center gap-1.5">
                        {v === true ? (
                          <CheckCircle2 className="size-3 shrink-0 text-emerald-400" />
                        ) : v === false ? (
                          <XCircle className="size-3 shrink-0 text-red-400" />
                        ) : (
                          <span className="border-border size-3 shrink-0 rounded-full border" />
                        )}
                        <code className="text-muted-foreground">{k}</code>
                      </li>
                    ))}
                  </ul>
                  {(registrationProbe.errors ?? []).length > 0 && (
                    <ul className="space-y-0.5 pt-1 text-red-300">
                      {registrationProbe.errors?.map((e, i) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Alert>
          )}

          {/* Embedded Signup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">
                {t('connectTitle')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('connectDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config?.phone_number_id && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {t('phoneNumberId')}
                  </Label>
                  <Input
                    readOnly
                    value={config.phone_number_id}
                    className="bg-muted border-border text-muted-foreground font-mono text-sm"
                  />
                </div>
              )}
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-[#1877F2] text-white hover:bg-[#166fe0]"
              >
                {connecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('connecting')}
                  </>
                ) : (
                  <>
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                    </svg>
                    {config ? t('reconnectWithMeta') : t('connectWithMeta')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Webhook URL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">
                {t('webhookTitle')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('webhookDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {t('webhookUrl')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="bg-muted border-border text-muted-foreground font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyWebhookUrl}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !config}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {testing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('testing')}
                </>
              ) : (
                <>
                  <Zap className="size-4" />
                  {t('testConnection')}
                </>
              )}
            </Button>
            {config && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetting}
                className="border-red-900 text-red-400 hover:bg-red-950/40 hover:text-red-300"
              >
                {resetting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('resetting')}
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    {t('resetConfig')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* How it works sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base">
                {t('howItWorksTitle')}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('howItWorksDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {(['howItWorksStep1', 'howItWorksStep2', 'howItWorksStep3'] as const).map(
                  (key, i) => (
                    <li key={key} className="flex items-start gap-3">
                      <span className="bg-primary text-primary-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {t(key)}
                      </span>
                    </li>
                  )
                )}
              </ol>
              <div className="border-border mt-4 border-t pt-4">
                <a
                  href="https://developers.facebook.com/docs/whatsapp/embedded-signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  {t('metaDocs')}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
