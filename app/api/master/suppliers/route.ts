import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getSessionMasterAdmin } from '@/lib/master-auth';

export async function GET() {
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('contractors')
    .select(
      'id, company_name, email, slug, account_type, created_at, stripe_subscription_status, billing_access_override, billing_access_override_note'
    )
    .eq('account_type', 'supplier')
    .order('company_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suppliers: data ?? [] });
}
