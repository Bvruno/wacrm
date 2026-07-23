import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCulqiOrder } from '@/lib/culqi/client';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  // Get the payment link
  const { data: link, error: linkError } = await supabase
    .from('payment_links')
    .select('*, course:courses(title)')
    .eq('code', code)
    .maybeSingle();

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  if (!link) return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
  if (link.status !== 'pending') return NextResponse.json({ error: 'Enlace ya procesado' }, { status: 410 });

  try {
    const culqiOrder = await createCulqiOrder({
      amount: link.amount_pen,
      description: link.course?.title || 'Curso',
    });

    const { error: insertError } = await supabase
      .from('payment_orders')
      .insert({
        account_id: link.account_id,
        payment_link_id: link.id,
        culqi_order_id: culqiOrder.id,
        amount_pen: link.amount_pen,
        cip_code: culqiOrder.cip_code,
        cip_qr_url: culqiOrder.cip_url,
        customer_name: link.contact_name || null,
      });

    if (insertError) {
      console.error('Error saving payment order:', insertError);
    }

    return NextResponse.json({
      culqi_order_id: culqiOrder.id,
      cip_code: culqiOrder.cip_code,
      cip_qr_url: culqiOrder.cip_url,
      amount_pen: link.amount_pen,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear orden';
    console.error('Culqi create order error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
