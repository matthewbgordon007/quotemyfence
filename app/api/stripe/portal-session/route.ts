import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getActiveContractorUser, isContractorAdminRole } from '@/lib/contractor-auth-helpers';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const cu = await getActiveContractorUser(supabase);
    if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isContractorAdminRole(cu.role))
      return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
    const userRow = { contractor_id: cu.contractorId };

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: contractor } = await supabaseAdmin
      .from('contractors')
      .select('stripe_customer_id')
      .eq('id', userRow.contractor_id)
      .single();

    if (!contractor?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer yet' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const origin = typeof body?.origin === 'string' && body.origin ? body.origin : request.nextUrl.origin;
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: contractor.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('stripe portal error', error);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}

