import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function toIso(unixSeconds?: number | null): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing webhook secret/signature' }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    console.error('stripe webhook signature error', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const contractorId = session.metadata?.contractor_id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
        const customerId = typeof session.customer === 'string' ? session.customer : null;

        if (contractorId) {
          let status: string | null = null;
          let currentPeriodEnd: string | null = null;
          let trialEnd: string | null = null;

          if (subscriptionId) {
            const sub = await getStripe().subscriptions.retrieve(subscriptionId);
            status = sub.status;
            currentPeriodEnd = toIso(sub.items.data?.[0]?.current_period_end || null);
            trialEnd = toIso(sub.trial_end);
          }

          await supabaseAdmin
            .from('contractors')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_subscription_status: status,
              stripe_current_period_end: currentPeriodEnd,
              stripe_trial_ends_at: trialEnd,
            })
            .eq('id', contractorId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : null;
        if (!customerId) break;
        await supabaseAdmin
          .from('contractors')
          .update({
            stripe_subscription_id: sub.id,
            stripe_subscription_status: sub.status,
            stripe_current_period_end: toIso(sub.items.data?.[0]?.current_period_end || null),
            stripe_trial_ends_at: toIso(sub.trial_end),
          })
          .eq('stripe_customer_id', customerId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('stripe webhook handler error', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

