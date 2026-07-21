'use client'

import { usePathname } from 'next/navigation'

const breadcrumbLabels: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/accounts': 'Accounts',
  '/admin/plans': 'Plans',
  '/admin/usage': 'Usage',
  '/admin/audit': 'Audit',
  '/admin/features': 'Features',
}

export function AdminHeader() {
  const pathname = usePathname()

  const segment = '/' + pathname.split('/').slice(0, 3).join('/')
  const currentLabel = breadcrumbLabels[segment] ?? segment

  return (
    <header className="flex h-14 items-center border-b bg-background px-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Admin</span>
        {currentLabel !== 'Dashboard' && (
          <>
            <span className="text-muted-foreground/40">&gt;</span>
            <span>{currentLabel}</span>
          </>
        )}
      </nav>
    </header>
  )
}
