import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const contractorId = session.metadata?.contractor_id;
        if (!contractorId) break;

        const subscriptionId = session.subscription as string | null;
        const customerId = session.customer as string | null;

        if (subscriptionId && customerId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const status = subscription.status;
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          const trialEnd = subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null;

          await supabase
            .from('contractors')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: status,
              subscription_current_period_end: periodEnd,
              trial_ends_at: trialEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contractorId);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const contractorId = subscription.metadata?.contractor_id;
        if (!contractorId) break;

        const status = subscription.status;
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        await supabase
          .from('contractors')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: status,
            subscription_current_period_end: periodEnd,
            trial_ends_at: trialEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contractorId);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const contractorId = subscription.metadata?.contractor_id;
        if (!contractorId) break;

        const customerId = subscription.customer as string;
        const status = subscription.status;
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        await supabase
          .from('contractors')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_status: status,
            subscription_current_period_end: periodEnd,
            trial_ends_at: trialEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contractorId);
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
