import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex'); // 8-char hex code
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const json = await request.json();
  const { course_id, amount_pen, contact_id, contact_name } = json;

  if (!course_id || !amount_pen) {
    return NextResponse.json({ error: 'Faltan campos (course_id, amount_pen)' }, { status: 400 });
  }

  // Verify course belongs to user's account
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', session.user.id)
    .single();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 400 });
  }

  const { data: course } = await supabase
    .from('courses')
    .select('account_id')
    .eq('id', course_id)
    .single();

  if (!course || course.account_id !== profile.account_id) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  // Generate unique code
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('payment_links')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const amountInCents = Math.round(amount_pen * 100);

  const { data, error } = await supabase
    .from('payment_links')
    .insert({
      account_id: profile.account_id,
      course_id,
      code,
      amount_pen: amountInCents,
      contact_id: contact_id || null,
      contact_name: contact_name?.trim() || null,
    })
    .select('*, course:courses(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
