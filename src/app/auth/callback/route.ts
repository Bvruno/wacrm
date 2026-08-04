import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// /auth/callback — PKCE code exchange for every Supabase flow
// that bounces off the browser: OAuth (Google/Facebook), email
// verification after signup, and password-reset emails.
//
// The provider / GoTrue redirects here with a short-lived `code`
// plus the intent we stamped into `redirectTo`:
//   - `invite=<token>`  → OAuth from /login?invite= or /signup?invite=
//   - `next=/join/<t>`  → email verification during invite signup
//   - `next=/reset-password` → password reset link
//   - default           → /dashboard
//
// `next` is validated to a relative path so a tampered query
// string can't turn this into an open redirect.
// ============================================================

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const invite = searchParams.get('invite');
  const nextParam = searchParams.get('next');

  let next = '/dashboard';
  if (invite) {
    next = `/join/${encodeURIComponent(invite)}`;
  } else if (
    nextParam &&
    nextParam.startsWith('/') &&
    !nextParam.startsWith('//')
  ) {
    next = nextParam;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Behind a CDN/proxy (Hostinger) the externally visible host
      // lives in x-forwarded-host; using it keeps the redirect on
      // the public domain instead of the internal origin.
      const forwardedHost = request.headers.get('x-forwarded-host');
      const base = forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
