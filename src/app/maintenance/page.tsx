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
