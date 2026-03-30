import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { doubleGatePriceFromSingle } from '@/lib/gate-pricing';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return ur?.contractor_id ?? null;
}

type TierPayload = {
  min_ft: number;
  max_ft?: number | string | null;
  base_price_per_ft_low: number;
  base_price_per_ft_high: number;
  single_gate_low: number;
  single_gate_high: number;
  double_gate_low: number;
  double_gate_high: number;
  removal_price_per_ft_low: number;
  removal_price_per_ft_high: number;
  minimum_job_low: number;
  minimum_job_high: number;
};

type Body = {
  fence_style_id?: string;
  tiers?: TierPayload[];
};

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as Body;
  const fence_style_id = body.fence_style_id;
  if (!fence_style_id) return NextResponse.json({ error: 'fence_style_id required' }, { status: 400 });

  const tiers = Array.isArray(body.tiers) ? body.tiers : [];

  const { data: styleRow } = await supabase
    .from('fence_styles')
    .select('fence_type_id')
    .eq('id', fence_style_id)
    .single();
  if (!styleRow) return NextResponse.json({ error: 'Style not found' }, { status: 404 });

  const { data: ft } = await supabase.from('fence_types').select('contractor_id').eq('id', styleRow.fence_type_id).single();
  if (!ft || ft.contractor_id !== contractorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error: delErr } = await supabase
    .from('style_install_length_tiers')
    .delete()
    .eq('fence_style_id', fence_style_id)
    .eq('contractor_id', contractorId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (tiers.length === 0) {
    return NextResponse.json({ fence_style_id, tiers: [] });
  }

  const rows = [];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const min = Number(t.min_ft);
    const maxRaw = t.max_ft;
    const max =
      maxRaw === null || maxRaw === undefined || (typeof maxRaw === 'string' && maxRaw.trim() === '')
        ? null
        : Number(maxRaw);
    if (!Number.isFinite(min) || min < 0) {
      return NextResponse.json({ error: 'Each tier needs a valid min_ft (feet).' }, { status: 400 });
    }
    if (max != null && (!Number.isFinite(max) || max < min)) {
      return NextResponse.json({ error: 'Each tier max_ft must be empty (no upper limit) or >= min_ft.' }, { status: 400 });
    }
    const p = Number(t.base_price_per_ft_low) || 0;
    const singleLow = Number(t.single_gate_low) || 0;
    const doubleFromSingle = doubleGatePriceFromSingle(singleLow);
    rows.push({
      contractor_id: contractorId,
      fence_style_id,
      min_ft: min,
      max_ft: max,
      display_order: i,
      base_price_per_ft_low: p,
      base_price_per_ft_high: Number(t.base_price_per_ft_high) || p,
      single_gate_low: singleLow,
      single_gate_high: Number(t.single_gate_high) || singleLow,
      double_gate_low: doubleFromSingle,
      double_gate_high: doubleFromSingle,
      removal_price_per_ft_low: Number(t.removal_price_per_ft_low) || 0,
      removal_price_per_ft_high: Number(t.removal_price_per_ft_high) || Number(t.removal_price_per_ft_low) || 0,
      minimum_job_low: Number(t.minimum_job_low) || 0,
      minimum_job_high: Number(t.minimum_job_high) || Number(t.minimum_job_low) || 0,
      is_active: true,
    });
  }

  const { data, error } = await supabase.from('style_install_length_tiers').insert(rows).select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fence_style_id, tiers: data ?? [] });
}
