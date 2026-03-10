import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const TRIAL_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('contractor_id')
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .single();

    if (!userRow?.contractor_id) {
      return NextResponse.json(
        { error: 'Contractor account required. Complete setup first.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const priceId = (body.priceId || '').trim();

    if (!priceId || !priceId.startsWith('price_')) {
      return NextResponse.json(
        { error: 'Valid price ID is required' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          contractor_id: userRow.contractor_id,
        },
      },
      success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/paywall`,
      customer_email: user.email || undefined,
      metadata: {
        contractor_id: userRow.contractor_id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-checkout-session:', message);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
