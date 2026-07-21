'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Shield,
  Flag,
  ArrowLeftFromLine,
  type LucideIcon,
} from 'lucide-react'

const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Accounts', href: '/admin/accounts', icon: Building2 },
  { label: 'Plans', href: '/admin/plans', icon: CreditCard },
  { label: 'Usage', href: '/admin/usage', icon: BarChart3 },
  { label: 'Audit', href: '/admin/audit', icon: Shield },
  { label: 'Features', href: '/admin/features', icon: Flag },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold text-sm">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
          Admin
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeftFromLine className="size-4" />
          Back to app
        </Link>
      </div>
    </aside>
  )
}
