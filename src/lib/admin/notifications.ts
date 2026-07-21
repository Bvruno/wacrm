/* eslint-disable @typescript-eslint/no-explicit-any */
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

  const admin = getAdminClient()
  await admin.from('admin_audit_log').insert({
    actor_user_id: '(system)',
    action: `notification.${params.action}`,
    target_type: 'account',
    target_id: params.accountId,
    details: { notified: false, reason: params.reason },
  } as any)
}
