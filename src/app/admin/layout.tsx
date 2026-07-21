import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
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
