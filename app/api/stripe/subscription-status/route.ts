import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isBillingActive } from '@/lib/billing';

export async function GET() {
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

  const { data: contractor } = await supabase
    .from('contractors')
    .select(
      'company_name, stripe_customer_id, stripe_subscription_status, stripe_current_period_end, stripe_trial_ends_at, billing_access_override'
    )
    .eq('id', userRow.contractor_id)
    .single();

  const status = contractor?.stripe_subscription_status || null;
  const hasOverride = contractor?.billing_access_override === true;
  return NextResponse.json({
    status,
    company_name: contractor?.company_name || '',
    billing_active: hasOverride || isBillingActive(status),
    current_period_end: contractor?.stripe_current_period_end || null,
    trial_ends_at: contractor?.stripe_trial_ends_at || null,
    access_override: hasOverride,
    has_customer: !!contractor?.stripe_customer_id,
  });
}

