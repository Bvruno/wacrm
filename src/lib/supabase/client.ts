import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // PKCE auth-code flow: OAuth and email verification links hand
      // a short-lived `code` to /auth/callback, which exchanges it
      // server-side. `detectSessionInUrl: false` stops the browser
      // client from double-processing that code (implicit-flow
      // fragment handling would otherwise fight the server exchange).
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
    }
  );

  return browserClient;
}
