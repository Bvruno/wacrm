import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCulqiCharge } from '@/lib/culqi/client';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { source_id, email } = await request.json();
  if (!source_id) return NextResponse.json({ error: 'Falta token de tarjeta' }, { status: 400 });

  const { data: link, error: linkError } = await supabase
    .from('payment_links')
    .select('*, course:courses(title)')
    .eq('code', code)
    .maybeSingle();

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  if (!link) return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
  if (link.status !== 'pending') return NextResponse.json({ error: 'Enlace ya procesado' }, { status: 410 });

  try {
    const charge = await createCulqiCharge({
      amount: link.amount_pen,
      email: email || 'comprador@email.com',
      source_id,
    });

    const isPaid = charge.state === 'paid';

    if (isPaid) {
      await Promise.all([
        supabase.from('payment_orders').insert({
          account_id: link.account_id,
          payment_link_id: link.id,
          culqi_order_id: charge.id,
          amount_pen: link.amount_pen,
          payment_method: 'card',
          customer_email: email || null,
          status: 'paid',
          paid_at: new Date().toISOString(),
        }),
        supabase
          .from('payment_links')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', link.id),
      ]);
    }

    return NextResponse.json({
      success: isPaid,
      charge_id: charge.id,
      state: charge.state,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al procesar pago';
    console.error('Culqi charge error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
