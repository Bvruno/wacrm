import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payment_links')
    .select('code, amount_pen, status, contact_name, course:courses!inner(title, description)')
    .eq('code', code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
  if (data.status !== 'pending') return NextResponse.json({ error: 'Enlace ya fue pagado o expiró' }, { status: 410 });

  const course = Array.isArray(data.course) ? data.course[0] : data.course;

  return NextResponse.json({
    code: data.code,
    amount_pen: data.amount_pen,
    status: data.status,
    contact_name: data.contact_name,
    course_title: course?.title || 'Curso',
    course_description: course?.description || '',
  });
}
