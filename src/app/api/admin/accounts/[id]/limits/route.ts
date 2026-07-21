import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { checkPlanLimit } from '@/lib/plans/enforce'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin()
  const { id } = await params

  const agents = await checkPlanLimit(id, 'max_agents')
  const messages = await checkPlanLimit(id, 'max_messages_per_day')

  return NextResponse.json({
    agents,
    messagesToday: messages,
  })
}
