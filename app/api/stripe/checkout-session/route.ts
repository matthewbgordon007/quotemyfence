import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getStripe, getStripePriceId } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userRow } = await supabase
      .from('users')
      .select('contractor_id')
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .single();
    if (!userRow?.contractor_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: contractor } = await supabaseAdmin
      .from('contractors')
      .select('id, company_name, email, stripe_customer_id')
      .eq('id', userRow.contractor_id)
      .single();
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

    const stripe = getStripe();
    let customerId = contractor.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: contractor.email || user.email || undefined,
        name: contractor.company_name || undefined,
        metadata: { contractor_id: contractor.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('contractors')
        .update({ stripe_customer_id: customerId })
        .eq('id', contractor.id);
    }

    const body = await request.json().catch(() => ({}));
    const origin = typeof body?.origin === 'string' && body.origin ? body.origin : request.nextUrl.origin;
    const successUrl = `${origin}/dashboard/billing?status=success`;
    const cancelUrl = `${origin}/dashboard/billing?status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { contractor_id: contractor.id },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { contractor_id: contractor.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('stripe checkout error', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

