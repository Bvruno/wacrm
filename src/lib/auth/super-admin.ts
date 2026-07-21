import { createClient } from '@/lib/supabase/server'
import { ForbiddenError } from '@/lib/auth/account'

export async function getSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[SUPER_ADMIN] user:', user?.email, '| SAAS_OWNER_EMAIL:', process.env.SAAS_OWNER_EMAIL)
  if (!user || user.email !== process.env.SAAS_OWNER_EMAIL) return null
  return { supabase, user }
}

export async function requireSuperAdmin() {
  const ctx = await getSuperAdmin()
  if (!ctx) throw new ForbiddenError('Not authorized')
  return ctx
}
