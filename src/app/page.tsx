import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomePage from './(marketing)/page'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    if (user.email === process.env.SAAS_OWNER_EMAIL) redirect('/admin')
    redirect('/dashboard')
  }

  return <HomePage />
}
