import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser, isContractorAdminRole } from '@/lib/contractor-auth-helpers';

async function canEditColourPricing(
  supabase: Awaited<ReturnType<typeof createClient>>,
  colourOptionId: string,
  contractorId: string
) {
  const { data: co } = await supabase.from('colour_options').select('fence_style_id').eq('id', colourOptionId).single();
  if (!co) return false;
  const { data: fs } = await supabase.from('fence_styles').select('fence_type_id').eq('id', co.fence_style_id).single();
  if (!fs) return false;
  const { data: ft } = await supabase.from('fence_types').select('height_id, contractor_id').eq('id', fs.fence_type_id).single();
  if (!ft) return false;
  if (ft.contractor_id === contractorId) return true;
  if (ft.height_id) {
    const { data: h } = await supabase.from('fence_heights').select('contractor_id').eq('id', ft.height_id).single();
    return h?.contractor_id === contractorId;
  }
  return false;
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isContractorAdminRole(cu.role))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  const contractorId = cu.contractorId;

  const body = await request.json();
  const { colour_option_id } = body;
  if (!colour_option_id) return NextResponse.json({ error: 'colour_option_id required' }, { status: 400 });

  const allowed = [
    'base_price_per_ft_low',
    'base_price_per_ft_high',
    'single_gate_low',
    'single_gate_high',
    'double_gate_low',
    'double_gate_high',
    'removal_price_per_ft_low',
    'removal_price_per_ft_high',
    'minimum_job_low',
    'minimum_job_high',
  ];
  const updates: Record<string, number> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) {
      const n = Number(body[k]);
      updates[k] = Number.isFinite(n) ? n : 0;
    }
  }

  const allowedEdit = await canEditColourPricing(supabase, colour_option_id, contractorId);
  if (!allowedEdit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: rule } = await supabase
    .from('colour_pricing_rules')
    .select('id')
    .eq('colour_option_id', colour_option_id)
    .eq('contractor_id', contractorId)
    .maybeSingle();

  if (rule?.id) {
    const { data, error } = await supabase
      .from('colour_pricing_rules')
      .update(updates)
      .eq('id', rule.id)
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
    .from('colour_pricing_rules')
    .insert({
      contractor_id: contractorId,
      colour_option_id,
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
