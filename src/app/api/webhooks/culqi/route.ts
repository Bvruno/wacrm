import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const payload = await request.json();

  // Culqi sends events like: 'order.updated', 'charge.completed'
  const event = payload.event;
  const data = payload.data;

  console.log('[Culqi Webhook] event:', event, 'data:', JSON.stringify(data));

  if (!event || !data) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  try {
    if (event === 'charge.completed' || event === 'charge.updated') {
      const chargeId = data.id;
      const isPaid = data.state === 'paid';

      if (isPaid) {
        // Find the payment order by culqi_order_id
        const { data: order } = await supabase
          .from('payment_orders')
          .select('id, payment_link_id, status')
          .eq('culqi_order_id', chargeId)
          .maybeSingle();

        if (order && order.status !== 'paid') {
          await Promise.all([
            supabase
              .from('payment_orders')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', order.id),
            supabase
              .from('payment_links')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', order.payment_link_id),
          ]);
          console.log(`[Culqi Webhook] Payment ${chargeId} marked as paid`);
        }
      }
    }

    if (event === 'order.updated') {
      const orderId = data.id;
      const isPaid = data.state === 'paid';

      if (isPaid) {
        const { data: order } = await supabase
          .from('payment_orders')
          .select('id, payment_link_id, status')
          .eq('culqi_order_id', orderId)
          .maybeSingle();

        if (order && order.status !== 'paid') {
          await Promise.all([
            supabase
              .from('payment_orders')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', order.id),
            supabase
              .from('payment_links')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', order.payment_link_id),
          ]);
          console.log(`[Culqi Webhook] Order ${orderId} marked as paid`);
        }
      }
    }
  } catch (err) {
    console.error('[Culqi Webhook] Error processing event:', err);
  }

  return NextResponse.json({ received: true });
}
