import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import {
  exchangeSignupCode,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api';
import { encrypt, decrypt } from '@/lib/whatsapp/encryption';

/**
 * Resolve the caller's account_id from their profile. Inlined here
 * (rather than going through `@/lib/auth/account.getCurrentAccount`)
 * because the GET handler wants to return shaped 200s for every
 * non-auth failure mode, not throw — keeping the helper minimal lets
 * the existing response branches stay as-is.
 *
 * Returns null if the user has no profile or no account; callers
 * should treat that the same as "not connected".
 */
async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.account_id) return null;
  return data.account_id as string;
}

// Lazy-initialised service-role client. We need it to detect a
// phone_number_id already claimed by a *different* user — under RLS,
// the user's own session can't see other users' rows, so the conflict
// would be invisible without the service role.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null;
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

/**
 * GET /api/whatsapp/config
 *
 * Used by the "Test API Connection" button and by the page to check
 * whether the saved config is healthy. Returns 200 in all non-auth cases
 * so the UI can render an appropriate message rather than show a 500.
 *
 * Response shape:
 *   { connected: true,  phone_info: {...} }
 *   { connected: false, reason: 'no_config',        message: '...' }
 *   { connected: false, reason: 'token_corrupted',  message: '...', needs_reset: true }
 *   { connected: false, reason: 'meta_api_error',   message: '...' }
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_account',
          message: 'Your profile is not linked to an account.',
        },
        { status: 200 }
      );
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, access_token, status')
      .eq('account_id', accountId)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching whatsapp_config:', configError);
      return NextResponse.json(
        {
          connected: false,
          reason: 'db_error',
          message: 'Failed to fetch configuration',
        },
        { status: 200 }
      );
    }

    if (!config) {
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_config',
          message:
            'No WhatsApp configuration saved yet. Fill in the form and click Save Configuration.',
        },
        { status: 200 }
      );
    }

    // Try to decrypt the stored token with the current ENCRYPTION_KEY.
    // If this fails, the key changed (or was never consistent across envs).
    let accessToken: string;
    try {
      accessToken = decrypt(config.access_token);
    } catch (err) {
      console.error('[whatsapp/config GET] Token decryption failed:', err);
      return NextResponse.json(
        {
          connected: false,
          reason: 'token_corrupted',
          needs_reset: true,
          message:
            'The stored access token cannot be decrypted with the current ENCRYPTION_KEY. This usually means the key changed, or it differs between environments (local vs Hostinger vs Vercel). Click "Reset Configuration" below, then re-save.',
        },
        { status: 200 }
      );
    }

    // Validate credentials against Meta
    try {
      const phoneInfo = await verifyPhoneNumber({
        phoneNumberId: config.phone_number_id,
        accessToken,
      });
      return NextResponse.json({ connected: true, phone_info: phoneInfo });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown Meta API error';
      console.error(
        '[whatsapp/config GET] Meta API verification failed:',
        message
      );
      return NextResponse.json(
        {
          connected: false,
          reason: 'meta_api_error',
          message: `Meta API rejected the credentials: ${message}`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error in WhatsApp config GET:', error);
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/config
 *
 * Completes a Meta Embedded Signup flow: exchanges the authorization
 * code for a system-user token, verifies the selected phone number,
 * subscribes the WABA to this app, encrypts and stores everything.
 *
 * Body: { code: string, phone_number_id: string, waba_id: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, phone_number_id, waba_id } = body;

    if (!code || !phone_number_id || !waba_id) {
      return NextResponse.json(
        { error: 'code, phone_number_id and waba_id are required' },
        { status: 400 }
      );
    }

    // Exchange the Embedded Signup authorization code for a
    // system-user access token (long-lived, no expiry).
    let accessToken: string;
    try {
      accessToken = await exchangeSignupCode(code);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Embedded Signup code exchange failed:', message);
      return NextResponse.json(
        { error: `Meta code exchange failed: ${message}` },
        { status: 400 }
      );
    }

    // Reject if another account has already claimed this phone_number_id.
    // CodixIA is single-tenant-per-WhatsApp-number — letting two accounts
    // bind the same number causes the webhook's `.single()` lookup to
    // throw PGRST116 ("multiple rows"), silently dropping every
    // inbound message. See issue #136.
    const { data: claimed, error: claimedError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phone_number_id)
      .neq('account_id', accountId)
      .maybeSingle();

    if (claimedError) {
      console.error('Error checking phone_number_id ownership:', claimedError);
      return NextResponse.json(
        { error: 'Failed to validate configuration' },
        { status: 500 }
      );
    }

    if (claimed) {
      return NextResponse.json(
        {
          error:
            'This WhatsApp phone number is already linked to another account on this instance. Each phone number can only be connected to one CodixIA user.',
        },
        { status: 409 }
      );
    }

    // Verify the selected phone number with Meta BEFORE saving
    let phoneInfo;
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown Meta API error';
      console.error('Meta API verification failed during save:', message);
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 400 }
      );
    }

    // Webhook verify token: generated server-side. The platform owner
    // configures the webhook once in the Meta app; each account row
    // carries its own token for the GET verification handshake.
    const verifyToken = randomBytes(32).toString('hex');

    // Encrypt sensitive tokens before storing
    let encryptedAccessToken: string;
    let encryptedVerifyToken: string;
    try {
      encryptedAccessToken = encrypt(accessToken);
      encryptedVerifyToken = encrypt(verifyToken);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown encryption error';
      console.error('Encryption failed:', message);
      return NextResponse.json(
        {
          error:
            'Failed to encrypt token. Check that ENCRYPTION_KEY is a valid 64-character hex string in your environment variables.',
        },
        { status: 500 }
      );
    }

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle();

    // Embedded Signup registers the phone number (incl. two-step PIN)
    // during onboarding, so no /register call is needed here — mark it
    // registered and subscribe the WABA to this app for webhook events.
    const registeredAt = new Date().toISOString();

    let subscribedAppsAt: string | null = null;
    let subscriptionError: string | null = null;
    try {
      await subscribeWabaToApp({
        wabaId: waba_id,
        accessToken,
      });
      subscribedAppsAt = new Date().toISOString();
    } catch (err) {
      subscriptionError = err instanceof Error ? err.message : String(err);
      console.warn('WABA subscribed_apps failed (non-fatal):', subscriptionError);
    }

    const baseRow = {
      phone_number_id,
      waba_id,
      access_token: encryptedAccessToken,
      verify_token: encryptedVerifyToken,
      status: 'connected',
      connected_at: new Date().toISOString(),
      registered_at: registeredAt,
      subscribed_apps_at: subscribedAppsAt,
      last_registration_error: subscriptionError,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from('whatsapp_config')
        .update(baseRow)
        .eq('account_id', accountId);

      if (updateError) {
        console.error('Error updating whatsapp_config:', updateError);
        return NextResponse.json(
          { error: 'Failed to update configuration' },
          { status: 500 }
        );
      }
    } else {
      // Insert with both columns: `account_id` is the tenancy key
      // (NOT NULL post-017, UNIQUE so duplicates trip the constraint
      // up-front), `user_id` is the audit column identifying which
      // member of the account saved the config.
      const { error: insertError } = await supabase
        .from('whatsapp_config')
        .insert({
          account_id: accountId,
          user_id: user.id,
          ...baseRow,
        });

      if (insertError) {
        console.error('Error inserting whatsapp_config:', insertError);
        return NextResponse.json(
          { error: 'Failed to save configuration' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      saved: true,
      registered: true,
      subscribed: subscribedAppsAt != null,
      phone_info: phoneInfo,
    });
  } catch (error) {
    console.error('Error in WhatsApp config POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/config
 *
 * Removes the authenticated user's WhatsApp configuration row.
 * Used by the "Reset Configuration" button to recover from a corrupted
 * encrypted token (mismatched ENCRYPTION_KEY across environments).
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('whatsapp_config')
      .delete()
      .eq('account_id', accountId);

    if (deleteError) {
      console.error('Error deleting whatsapp_config:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in WhatsApp config DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
