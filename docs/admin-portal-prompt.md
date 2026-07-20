# Admin Portal — Prompt de Implementación

## Objetivo

Crear un portal administrativo bajo `/admin` donde el dueño del SaaS (super-admin) pueda gestionar todas las cuentas, planes, uso del sistema, auditoría y feature flags.

---

## 1. Super Admin

### Identificación
- Variable de entorno `SAAS_OWNER_EMAIL` en `.env`
- El super-admin se detecta comparando el email del usuario autenticado contra esta variable

### Guard (`src/lib/auth/super-admin.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import { ForbiddenError } from '@/lib/auth/errors'

export async function getSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SAAS_OWNER_EMAIL) return null
  return { supabase, user }
}

export async function requireSuperAdmin() {
  const ctx = await getSuperAdmin()
  if (!ctx) throw new ForbiddenError('Not authorized')
  return ctx
}
```

### Service-role client (`src/lib/supabase/admin.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

let _adminClient: ReturnType<typeof createClient> | null = null

export function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _adminClient
}
```

---

## 2. Migraciones de Base de Datos

### Migración 040: `subscription_plans`

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- centavos (0 = gratis)
  currency TEXT DEFAULT 'usd',
  interval TEXT DEFAULT 'month',
  stripe_price_id TEXT,
  features JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO subscription_plans (name, slug, description, price, currency, features, sort_order) VALUES
  ('Free', 'free', 'Perfect to get started', 0, 'usd', '{"max_agents": 2, "max_messages_per_day": 100, "has_broadcasts": false, "has_automations": false, "has_ai_assistant": false}', 1),
  ('Pro', 'pro', 'For growing teams', 2900, 'usd', '{"max_agents": 10, "max_messages_per_day": 1000, "has_broadcasts": true, "has_automations": true, "has_ai_assistant": true}', 2),
  ('Enterprise', 'enterprise', 'For organizations', 9900, 'usd', '{"max_agents": -1, "max_messages_per_day": -1, "has_broadcasts": true, "has_automations": true, "has_ai_assistant": true}', 3)
ON CONFLICT (slug) DO NOTHING;
```

### Migración 041: `account_plans`

```sql
CREATE TYPE account_plan_status AS ENUM ('active', 'trialing', 'past_due', 'cancelled', 'suspended');

CREATE TABLE account_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status account_plan_status DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  current_period_starts_at TIMESTAMPTZ DEFAULT now(),
  current_period_ends_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

INSERT INTO account_plans (account_id, plan_id)
SELECT a.id, sp.id
FROM accounts a
CROSS JOIN subscription_plans sp
WHERE sp.slug = 'free'
ON CONFLICT (account_id) DO NOTHING;

CREATE OR REPLACE FUNCTION assign_default_plan()
RETURNS trigger AS $$
BEGIN
  INSERT INTO account_plans (account_id, plan_id)
  SELECT NEW.id, id FROM subscription_plans WHERE slug = 'free';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_default_plan_trigger
  AFTER INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION assign_default_plan();
```

### Migración 042: `admin_audit_log`

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
```

### Migración 043: `feature_flags`

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feature_flags_account ON feature_flags(account_id);

INSERT INTO feature_flags (key, label, description, enabled) VALUES
  ('ai_assistant', 'AI Assistant', 'Enable AI reply assistant for all accounts', true),
  ('broadcasts', 'Broadcasts', 'Enable broadcast campaigns', true),
  ('automations', 'Automations', 'Enable no-code automations', true),
  ('public_api', 'Public API', 'Enable REST API access', true),
  ('flows', 'Flows', 'Enable visual flow builder', true)
ON CONFLICT (key) DO NOTHING;
```

### Migración 044: `deleted_at` en accounts

```sql
ALTER TABLE accounts ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at);
```

---

## 3. Enforcement de Planes

### Archivo: `src/lib/plans/enforce.ts`

```typescript
import { getAdminClient } from '@/lib/supabase/admin'
import { ForbiddenError } from '@/lib/auth/errors'

type LimitKey = 'max_agents' | 'max_messages_per_day'

export async function checkPlanLimit(accountId: string, limitKey: LimitKey) {
  const admin = getAdminClient()

  const { data } = await admin
    .from('account_plans')
    .select('plan:plan_id(features)')
    .eq('account_id', accountId)
    .single()

  const features = (data?.plan as any)?.features ?? {}
  const max = features[limitKey] ?? -1
  if (max === -1) return { allowed: true, current: 0, max: -1 }

  let current = 0
  if (limitKey === 'max_agents') {
    const { count } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
    current = count ?? 0
  } else if (limitKey === 'max_messages_per_day') {
    const today = new Date().toISOString().split('T')[0]
    const { count } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .gte('created_at', today)
    current = count ?? 0
  }

  return { allowed: current < max, current, max }
}

export async function enforcePlanLimit(accountId: string, limitKey: LimitKey) {
  const result = await checkPlanLimit(accountId, limitKey)
  if (!result.allowed) {
    throw new ForbiddenError(
      `Plan limit reached: ${limitKey} (${result.current}/${result.max})`
    )
  }
}
```

Usar en API routes relevantes:
- Antes de invitar miembro: `enforcePlanLimit(accountId, 'max_agents')`
- Antes de enviar mensaje: `enforcePlanLimit(accountId, 'max_messages_per_day')`

---

## 4. Notificaciones (Placeholder)

### Archivo: `src/lib/admin/notifications.ts`

```typescript
import { getAdminClient } from '@/lib/supabase/admin'

export async function notifyAccountAction(params: {
  accountId: string
  action: string
  reason?: string
}) {
  console.log(
    `[NOTIFY] Account ${params.accountId}: ${params.action}` +
      (params.reason ? ` (${params.reason})` : '')
  )

  // TODO: Integrate with email service (Resend, SendGrid, etc.)
  // 1. Fetch account owner email from profiles
  // 2. Send template email based on action
  // 3. Log in notification_logs table (future)

  const admin = getAdminClient()
  await admin.from('admin_audit_log').insert({
    actor_user_id: '(system)',
    action: `notification.${params.action}`,
    target_type: 'account',
    target_id: params.accountId,
    details: { notified: false, reason: params.reason },
  })
}
```

Llamar `notifyAccountAction(...)` después de suspender, reactivar o cambiar plan.

---

## 5. Expiración de Trials

### Archivo: `src/lib/plans/trials.ts`

```typescript
import { getAdminClient } from '@/lib/supabase/admin'

export async function checkExpiredTrials() {
  const admin = getAdminClient()

  const { data: expired } = await admin
    .from('account_plans')
    .select('*, accounts!inner(name)')
    .eq('status', 'trialing')
    .lt('trial_ends_at', new Date().toISOString())

  for (const plan of expired ?? []) {
    const { data: freePlan } = await admin
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'free')
      .single()

    await admin
      .from('account_plans')
      .update({
        plan_id: freePlan?.id,
        status: 'active',
        trial_ends_at: null,
      })
      .eq('id', plan.id)

    await admin.from('admin_audit_log').insert({
      actor_user_id: '(system)',
      action: 'plan.trial_expired',
      target_type: 'account',
      target_id: plan.account_id,
      details: { previous_plan_id: plan.plan_id },
    })

    console.log(`[TRIAL] Account ${plan.account_id} trial expired, downgraded to Free`)
  }
}
```

### Endpoint cron: `src/app/api/cron/check-trials/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { checkExpiredTrials } from '@/lib/plans/trials'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await checkExpiredTrials()
  return NextResponse.json({ ok: true })
}
```

Configurar en Vercel Cron Jobs (cada 24h):
```json
{
  "crons": [
    { "path": "/api/cron/check-trials", "schedule": "0 6 * * *" }
  ]
}
```

---

## 6. Middleware

### `src/middleware.ts` — añadir después del bloque de auth pages

```typescript
// Admin pages — must be authenticated; super-admin check is in layout
const adminPaths = ['/admin']
if (adminPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withRefreshedCookies(NextResponse.redirect(url))
  }
  return supabaseResponse
}
```

### Maintenance mode — antes de `return supabaseResponse`

```typescript
if (process.env.MAINTENANCE_MODE === 'true') {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isStaticAsset = request.nextUrl.pathname.startsWith('/_next/')
  if (!isAdminRoute && !isStaticAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    return NextResponse.rewrite(url)
  }
}
```

---

## 7. Root Page

### `src/app/page.tsx` — super-admin redirect a /admin

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomePage from './(marketing)/page'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    if (user.email === process.env.SAAS_OWNER_EMAIL) redirect('/admin')
    redirect('/dashboard')
  }

  return <HomePage />
}
```

---

## 8. API Routes (`src/app/api/admin/`)

Todas usan: `await requireSuperAdmin()` + `getAdminClient()`.

| Método | Ruta | Query / Body |
|--------|------|-------------|
| GET | `/api/admin/stats` | Total accounts, new 30d, messages total, active agents, accounts_by_plan (GROUP BY), recent accounts, monthly growth |
| GET | `/api/admin/accounts` | `?page=1&per_page=20&search=&plan=&status=&sort_by=created_at&sort_dir=desc` — excluye deleted_at IS NOT NULL |
| GET | `/api/admin/accounts/[id]` | Account + plan + members (join profiles) |
| POST | `/api/admin/accounts/[id]/suspend` | `{reason}` — update status='suspended', audit log, notify |
| POST | `/api/admin/accounts/[id]/reactivate` | Update status='active', audit log, notify |
| POST | `/api/admin/accounts/[id]/plan` | `{plan_id}` — update plan_id, audit log, notify |
| POST | `/api/admin/accounts/[id]/delete` | `{confirm: true, reason}` — soft delete (set deleted_at), detach profiles, audit log, notify |
| GET | `/api/admin/accounts/[id]/limits` | Estado actual de todos los límites (agents, messages today vs max) |
| GET/POST/PUT/DELETE | `/api/admin/plans`[/id] | CRUD subscription_plans |
| GET | `/api/admin/usage` | `?period=30d&metric=messages` — series de tiempo |
| GET | `/api/admin/audit` | `?page=1&per_page=50&action=&target_type=&from=&to=` |
| GET/PUT | `/api/admin/features`[/id] | List / update feature flags |

### Stats endpoint detail

```typescript
// GET /api/admin/stats → {
//   totalAccounts,           // COUNT accounts WHERE deleted_at IS NULL
//   newAccounts30d,          // COUNT accounts created in last 30d
//   totalMessagesSent,       // COUNT messages (all time)
//   activeAgentsToday,       // COUNT member_presence WHERE status='online'
//   accountsByPlan,          // { free: 120, pro: 25, enterprise: 5 }
//   recentAccounts: [{ id, name, ownerEmail, createdAt }],
//   monthlyGrowth: [{ month: '2026-01', count: 10 }, ...]
// }
```

### Accounts endpoint detail

```typescript
// GET /api/admin/accounts → {
//   accounts: [{
//     id, name, createdAt,
//     ownerEmail,            // from profiles join
//     plan: { name, slug },
//     status,                // from account_plans
//     memberCount,
//     trialEndsAt,
//   }],
//   total,
//   page,
//   perPage
// }
```

---

## 9. Self-Serve Billing (Settings del Dashboard)

### API nueva: `src/app/api/account/plan/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/account'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const ctx = await requireRole('viewer')
  const admin = getAdminClient()

  const { data: accountPlan } = await admin
    .from('account_plans')
    .select('*, plan:plan_id(*)')
    .eq('account_id', ctx.accountId)
    .single()

  // Count current agents
  const { count: agents } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', ctx.accountId)

  // Count messages today
  const today = new Date().toISOString().split('T')[0]
  const { count: messagesToday } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', ctx.accountId)
    .gte('created_at', today)

  const plan = accountPlan?.plan
  const features = (plan?.features as any) ?? {}

  return NextResponse.json({
    plan: {
      name: plan?.name,
      slug: plan?.slug,
      price: plan?.price,
      currency: plan?.currency,
    },
    status: accountPlan?.status,
    trialEndsAt: accountPlan?.trial_ends_at,
    limits: {
      maxAgents: features.max_agents ?? -1,
      maxMessagesPerDay: features.max_messages_per_day ?? -1,
      hasBroadcasts: features.has_broadcasts ?? false,
      hasAutomations: features.has_automations ?? false,
      hasAiAssistant: features.has_ai_assistant ?? false,
    },
    usage: {
      agents: agents ?? 0,
      messagesToday: messagesToday ?? 0,
    },
  })
}
```

### Componente: `src/components/settings/billing-tab.tsx`

- Fetch de `GET /api/account/plan`
- Muestra plan name + status (active/trialing/suspended)
- Barras de progreso: agents (X/Y), messages today (X/Y)
- Lista de features habilitadas con checks
- Botón "Upgrade" (solo para owner): mailto o dialog de contacto
- Si está en trial: muestra fecha de expiración

### Modificar `src/app/(dashboard)/settings/page.tsx`

Agregar tab `plan` (entre profile y security, por ejemplo):

```typescript
const tabs = [
  { key: 'overview', label: tOverview('title'), component: <SettingsOverview /> },
  { key: 'profile', label: tProfile('title'), component: <ProfileForm /> },
  { key: 'plan', label: 'Plan', component: <BillingTab /> },  // NUEVO
  { key: 'security', label: tSecurity('title'), component: <SecurityPanel /> },
  // ... resto
]
```

---

## 10. Página de Mantenimiento

### `src/app/maintenance/page.tsx`

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Under Maintenance — wacrm',
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md px-4 text-center">
        <div className="text-6xl">🔧</div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">
          Under Maintenance
        </h1>
        <p className="mt-4 text-muted-foreground">
          We&apos;re performing some upgrades. We&apos;ll be back shortly.
        </p>
      </div>
    </div>
  )
}
```

---

## 11. Route Group `(admin)/`

### Layout (`src/app/(admin)/layout.tsx`)

```typescript
import { redirect } from 'next/navigation'
import { getSuperAdmin } from '@/lib/auth/super-admin'
import { AdminLayout } from '@/components/admin/admin-layout'

export const metadata: Metadata = {
  title: {
    default: 'Admin — wacrm',
    template: '%s — Admin wacrm',
  },
  robots: { index: false, follow: false },
}

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getSuperAdmin()
  if (!ctx) redirect('/dashboard')

  return <AdminLayout email={ctx.user.email!}>{children}</AdminLayout>
}
```

### Páginas

| Ruta | Archivo | Contenido |
|------|---------|-----------|
| `/admin` | `page.tsx` | Grid de stats-card + tabla últimas cuentas + gráfico crecimiento mensual |
| `/admin/accounts` | `accounts/page.tsx` | accounts-table con search, filtros (plan, status), paginación |
| `/admin/accounts/[id]` | `accounts/[id]/page.tsx` | account-detail-card + miembros + límites actuales + botones Suspend/Reactivate/Delete/Change Plan |
| `/admin/plans` | `plans/page.tsx` | Lista de planes con cards + modal create/edit (plan-form) |
| `/admin/usage` | `usage/page.tsx` | usage-chart con selector de métrica y período |
| `/admin/audit` | `audit/page.tsx` | audit-table con filtros por acción, tipo, rango de fechas |
| `/admin/features` | `features/page.tsx` | Grid feature-flag-card con toggle, filtro global/per-account |

---

## 12. Componentes (`src/components/admin/`)

### admin-sidebar.tsx

Sidebar vertical fijo (~240px) con:

| Link | Icono |
|------|-------|
| Dashboard | `LayoutDashboard` |
| Accounts | `Building2` |
| Plans | `CreditCard` |
| Usage | `BarChart3` |
| Audit | `Shield` |
| Features | `Flag` |

Estados activos con primary color. Badge "Admin" o indicador visual. Borde derecho, fondo sutilmente distinto.

### admin-header.tsx

Breadcrumb: `Admin > {current section}`. Botón "Back to app" → `/dashboard`.

### admin-layout.tsx

```typescript
'use client'

export function AdminLayout({
  children,
  email,
}: {
  children: React.ReactNode
  email: string
}) {
  // Podría verificar super-admin en client como respaldo
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

### stats-card.tsx

Props: `{ title: string, value: string | number, description?: string, trend?: { value: number, positive: boolean }, icon: LucideIcon }`

Card con icono, valor grande, descripción y trend opcional.

### accounts-table.tsx

Tabla con: nombre cuenta, email owner, plan, status, miembros, creado, acciones (View, Suspend/Reactivate, Change Plan).
Input search, filtros plan y status. Paginación. Usar `@/components/ui/table`.

### account-detail-card.tsx

Info de cuenta (nombre, owner, creado, deleted_at si aplica) + plan actual + tabla de miembros con roles + límites actuales vs uso. Botones: Suspend (si active), Reactivate (si suspended), Change Plan (abre dialog con selector de planes), Delete (confirmación 2 pasos).

### plan-form.tsx

Dialog con form: name, slug (auto-generado), description, price (USD → centavos), currency, interval, features (JSON editor simple o checkboxes para flags comunes).

### usage-chart.tsx

Gráfico de barras simple con divs. Props: `{ data: { label, value }[], title, height? }`.

### audit-table.tsx

Tabla con timestamp, actor (email), acción, target, detalles expandibles. Filtros: acción, target_type, rango fechas.

### feature-flag-card.tsx

Card con Switch toggle, label, description. Si `account_id` presente, mostrar "Per-account: {account name}". Si global, badge "Global".

---

## 13. Archivos a Crear (~40)

```
supabase/migrations/
  040_subscription_plans.sql
  041_account_plans.sql
  042_admin_audit_log.sql
  043_feature_flags.sql
  044_accounts_deleted_at.sql

src/lib/auth/
  super-admin.ts

src/lib/supabase/
  admin.ts

src/lib/plans/
  enforce.ts
  trials.ts

src/lib/admin/
  notifications.ts

src/components/admin/
  admin-layout.tsx
  admin-header.tsx
  admin-sidebar.tsx
  stats-card.tsx
  accounts-table.tsx
  account-detail-card.tsx
  plan-form.tsx
  usage-chart.tsx
  audit-table.tsx
  feature-flag-card.tsx

src/components/settings/
  billing-tab.tsx

src/app/(admin)/
  layout.tsx
  page.tsx
  accounts/page.tsx
  accounts/[id]/page.tsx
  plans/page.tsx
  usage/page.tsx
  audit/page.tsx
  features/page.tsx

src/app/api/admin/
  stats/route.ts
  accounts/route.ts
  accounts/[id]/route.ts
  accounts/[id]/suspend/route.ts
  accounts/[id]/reactivate/route.ts
  accounts/[id]/plan/route.ts
  accounts/[id]/delete/route.ts
  accounts/[id]/limits/route.ts
  plans/route.ts
  plans/[id]/route.ts
  usage/route.ts
  audit/route.ts
  features/route.ts
  features/[id]/route.ts

src/app/api/account/
  plan/route.ts

src/app/api/cron/
  check-trials/route.ts

src/app/
  maintenance/page.tsx
```

---

## 14. Archivos a Modificar (5)

```
src/app/page.tsx                          ← super-admin redirect a /admin
src/middleware.ts                          ← exluir /admin + maintenance mode
src/app/(dashboard)/settings/page.tsx      ← agregar tab "plan"
.env.local.example                         ← SAAS_OWNER_EMAIL, CRON_SECRET, MAINTENANCE_MODE
```

---

## 15. .env

Añadir a `.env.local.example`:

```
SAAS_OWNER_EMAIL=tu@email.com
CRON_SECRET=your-cron-secret-here
MAINTENANCE_MODE=false
```

---

## 16. Orden de Implementación Sugerido

1. `src/lib/supabase/admin.ts` — service-role client
2. `src/lib/auth/super-admin.ts` — guard function
3. Migraciones 040 → 044 (ejecutar en orden)
4. `src/lib/plans/enforce.ts` — enforcement de límites
5. `src/lib/plans/trials.ts` — expiración de trials
6. `src/lib/admin/notifications.ts` — placeholder notificaciones
7. API routes de admin (stats → accounts → plans → usage → audit → features)
8. API route de self-serve (`/api/account/plan`)
9. API route de cron (`/api/cron/check-trials`)
10. Componentes de admin (sidebar → header → layout → stats-card → accounts-table → resto)
11. Componente billing-tab.tsx
12. Layout `(admin)/layout.tsx`
13. Páginas de admin (Dashboard primero, luego accounts, plans, usage, audit, features)
14. Página de mantenimiento
15. Modificar `page.tsx`, `middleware.ts`, `settings/page.tsx`, `.env.local.example`
16. `npm run typecheck && npm run lint && npm run build`
17. Probar navegación en dev
