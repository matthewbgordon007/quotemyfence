import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getActiveContractorUser } from '@/lib/contractor-auth-helpers';
import { isBillingActive } from '@/lib/billing';

/** Any active team member may read status (e.g. billing page when subscription lapsed). Mutations stay admin-only. */
export async function GET() {
  const supabase = await createServerClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: contractor } = await supabase
    .from('contractors')
    .select(
      'company_name, stripe_customer_id, stripe_subscription_status, stripe_current_period_end, stripe_trial_ends_at, billing_access_override'
    )
    .eq('id', cu.contractorId)
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

