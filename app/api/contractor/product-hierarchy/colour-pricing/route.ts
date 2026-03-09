import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { colour_option_id } = body;
  if (!colour_option_id) return NextResponse.json({ error: 'colour_option_id required' }, { status: 400 });

  const allowed = [
    'base_price_per_ft_low', 'base_price_per_ft_high',
    'single_gate_low', 'single_gate_high', 'double_gate_low', 'double_gate_high',
    'removal_price_per_ft_low', 'removal_price_per_ft_high',
    'minimum_job_low', 'minimum_job_high',
  ];
  const updates: Record<string, number> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = Number(body[k]) || 0;
  }

  const { data: rule } = await supabase
    .from('colour_pricing_rules')
    .select('id')
    .eq('colour_option_id', colour_option_id)
    .eq('contractor_id', contractorId)
    .single();

  if (!rule) return NextResponse.json({ error: 'Pricing rule not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('colour_pricing_rules')
    .update(updates)
    .eq('id', rule.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
