import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('delete_my_session', {
      p_session_id: id,
    })

    if (error) {
      console.error(
        '[DELETE /api/sessions/[id]] RPC error:',
        error,
      )
      return NextResponse.json(
        { error: 'Failed to revoke session' },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/sessions/[id]]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
