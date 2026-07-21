import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_my_sessions')

    if (error) {
      console.error('[GET /api/sessions] RPC error:', error)
      return NextResponse.json(
        { error: 'Failed to list sessions' },
        { status: 500 },
      )
    }

    return NextResponse.json({ sessions: data ?? [] })
  } catch (err) {
    console.error('[GET /api/sessions]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
