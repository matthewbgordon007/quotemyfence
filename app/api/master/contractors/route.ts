import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getMasterAdminId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ma } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  return ma?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const masterId = await getMasterAdminId(supabase);
  if (!masterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('contractors')
    .select(
      'id, company_name, email, slug, created_at, stripe_subscription_status, billing_access_override, billing_access_override_note'
    )
    .order('company_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contractors: data ?? [] });
}

