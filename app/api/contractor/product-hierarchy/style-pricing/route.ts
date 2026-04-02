import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser, isContractorAdminRole } from '@/lib/contractor-auth-helpers';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isContractorAdminRole(cu.role))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  const contractorId = cu.contractorId;

  const body = await request.json();
  const { fence_style_id } = body;
  if (!fence_style_id) return NextResponse.json({ error: 'fence_style_id required' }, { status: 400 });

  const { data: styleRow } = await supabase
    .from('fence_styles')
    .select('fence_type_id')
    .eq('id', fence_style_id)
    .single();
  if (!styleRow) return NextResponse.json({ error: 'Style not found' }, { status: 404 });

  const { data: ft } = await supabase.from('fence_types').select('contractor_id').eq('id', styleRow.fence_type_id).single();
  if (!ft || ft.contractor_id !== contractorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const allowed = [
    'base_price_per_ft_low', 'base_price_per_ft_high',
    'single_gate_low', 'single_gate_high', 'double_gate_low', 'double_gate_high',
    'removal_price_per_ft_low', 'removal_price_per_ft_high',
    'minimum_job_low', 'minimum_job_high',
  ];
  const updates: Record<string, number> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = Number(body[k]) ?? 0;
  }

  const { data: existing } = await supabase
    .from('style_pricing_rules')
    .select('id')
    .eq('fence_style_id', fence_style_id)
    .eq('contractor_id', contractorId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('style_pricing_rules')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const p = updates.base_price_per_ft_low ?? updates.base_price_per_ft_high ?? 74.99;
  const s = updates.single_gate_low ?? updates.single_gate_high ?? 450;
  const d = updates.double_gate_low ?? updates.double_gate_high ?? 800;
  const r = updates.removal_price_per_ft_low ?? updates.removal_price_per_ft_high ?? 5;
  const m = updates.minimum_job_low ?? updates.minimum_job_high ?? 500;

  const { data, error } = await supabase
    .from('style_pricing_rules')
    .insert({
      contractor_id: contractorId,
      fence_style_id,
      base_price_per_ft_low: p,
      base_price_per_ft_high: p,
      single_gate_low: s,
      single_gate_high: s,
      double_gate_low: d,
      double_gate_high: d,
      removal_price_per_ft_low: r,
      removal_price_per_ft_high: r,
      minimum_job_low: m,
      minimum_job_high: m,
      is_active: true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
