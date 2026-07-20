<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project

Self-hostable WhatsApp CRM template: shared inbox, contacts, pipelines, broadcasts, no-code automations, AI reply assistant.
Stack: Next.js 16 (App Router, server actions), React 19, TypeScript 6, Tailwind v4, Supabase (Postgres + Auth + RLS), shadcn/ui (base-nova style, Lucide icons).

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Turbopack dev server (port 3000) |
| `npm run build` | Production build (includes its own typecheck) |
| `npm run typecheck` | `tsc --noEmit` — fast standalone check |
| `npm run lint` | ESLint (next core-web-vitals + typescript) |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check-only (use in CI) |
| `npm run test` | Vitest run (single pass) |
| `npm run test:watch` | Vitest watch |

**Before pushing changes:** run `npm run typecheck && npm run lint && npm run test` in order.

**MCP server** lives in `mcp-server/` — a separate ESM package with its own `package.json`, `tsconfig.json`, and lockfile. Build with `npm run build` inside that directory.

## Path alias

`@/*` resolves to `./src/*`. Use it everywhere — never relative `../../` chains.

## Route groups

- `(auth)/` — login, signup, forgot-password. Public.
- `(dashboard)/` — all app features (inbox, contacts, pipelines, broadcasts, automations, flows, settings, notifications, agents). Protected by `src/middleware.ts` (Supabase session check).

## API routes

All under `src/app/api/`. Key segments:
- `/api/v1/` — public REST API with scoped, revocable API keys (see `docs/public-api.md`)
- `/api/whatsapp/webhook` — Meta inbound webhook (HMAC-verified, unauthenticated)
- `/api/ai/` — AI reply assistant endpoints
- Other: `/api/account`, `/api/contacts`, `/api/automations`, `/api/flows`, `/api/invitations`, `/api/quick-replies`

## Code conventions

- **Prettier:** single quotes, trailing commas (es5), 80-col, 2-space indent, LF line endings, `prettier-plugin-tailwindcss`.
- **No comments** in new code unless the user asks for them.
- **shadcn components** live in `src/components/ui/`. Add new ones via `npx shadcn@latest add <component>`. Config in `components.json` (base-nova style, Lucide icons).
- **Feature directories** mirror under `src/components/<feature>/`, `src/lib/<feature>/`, and `src/app/(dashboard)/<feature>/`.
- **Hooks** in `src/hooks/`. Custom ones follow `use-*.tsx` naming (e.g. `use-auth.tsx`).
- **i18n** via `next-intl`. Locale from `NEXT_PUBLIC_APP_LOCALE` env var. Message dictionaries in `messages/*.json` (currently `en.json`, `ko.json`).
- **Types** in `src/types/index.ts`.

## Testing

- Vitest, node environment. Tests in `src/**/*.test.ts(x)`.
- Dummy secrets (`ENCRYPTION_KEY`, `META_APP_SECRET`) are set in `vitest.config.ts` — tests never hit real Meta/Supabase services.
- Run a single test file: `npx vitest run src/lib/some-file.test.ts`

## Database

Supabase migrations in `supabase/migrations/` (numbered sequentially). RLS is enforced on every table. The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never be used in client code.

## Environment

Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY` (64 hex chars), `META_APP_SECRET`. See `.env.local.example` for the full list with explanations.

## Gotchas

- **Middleware cookie refresh** (`src/middleware.ts`): every redirect/JSON branch must copy refreshed Supabase cookies or the session wedges after idle (issue #288). The `withRefreshedCookies` helper handles this — always use it instead of returning a bare `NextResponse`.
- **CSP is report-only** in `next.config.ts` — not enforced yet. Don't add external domains to the policy unless you verify they don't break existing routes.
- **Hostinger cache**: the `Cache-Control` headers in `next.config.ts` exist to work around Hostinger's CDN serving stale HTML. Edit carefully.
- **Dev tunnel origins**: `next.config.ts` allow-lists ngrok/cloudflare tunnels for HMR. Add new tunnel domains there, not in middleware.
- **`public/opus/`**: vendored minified opus-recorder worker — ESLint ignores it, don't modify without understanding the binary format.
