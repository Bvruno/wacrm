import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let exchangeError: { message: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: exchangeError }),
    },
  }),
}));

const { GET } = await import('./route');

function callbackRequest(
  url: string,
  headers: Record<string, string> = {}
): Request {
  return new Request(url, { headers });
}

beforeEach(() => {
  exchangeError = null;
});

afterEach(() => vi.clearAllMocks());

describe('GET /auth/callback — post-exchange redirect', () => {
  it('keeps http for local dev where Next injects x-forwarded-* itself', async () => {
    const res = await GET(
      callbackRequest('http://localhost:3000/auth/callback?code=x', {
        'x-forwarded-host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('uses https on a proxy/CDN that forwards proto=https', async () => {
    const res = await GET(
      callbackRequest('http://internal:3000/auth/callback?code=x', {
        'x-forwarded-host': 'crm.example.com',
        'x-forwarded-proto': 'https',
      })
    );

    expect(res.headers.get('location')).toBe('https://crm.example.com/dashboard');
  });

  it('defaults to https for a forwarded host without a proto', async () => {
    const res = await GET(
      callbackRequest('http://internal:3000/auth/callback?code=x', {
        'x-forwarded-host': 'crm.example.com',
      })
    );

    expect(res.headers.get('location')).toBe('https://crm.example.com/dashboard');
  });

  it('falls back to the request origin when no forwarded host is present', async () => {
    const res = await GET(
      callbackRequest(
        'http://localhost:3000/auth/callback?code=x&next=/join/abc123'
      )
    );

    expect(res.headers.get('location')).toBe('http://localhost:3000/join/abc123');
  });

  it('redirects to /login?error=oauth when the code exchange fails', async () => {
    exchangeError = { message: 'invalid code' };

    const res = await GET(
      callbackRequest('http://localhost:3000/auth/callback?code=x', {
        'x-forwarded-host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      })
    );

    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?error=oauth'
    );
  });
});
