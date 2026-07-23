import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Course } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Course[]);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const json = await request.json();
  const { title, description, price_pen } = json;

  if (!title || !price_pen) {
    return NextResponse.json({ error: 'Faltan campos requeridos (title, price_pen)' }, { status: 400 });
  }

  // Get account_id from the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', session.user.id)
    .single();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No se encontró la cuenta' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('courses')
    .insert({
      account_id: profile.account_id,
      user_id: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      price_pen: Math.round(price_pen * 100), // convert to cents
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as Course, { status: 201 });
}
