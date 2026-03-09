import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { product_id, height_ft, color, style_name } = body;

  if (!product_id) {
    return NextResponse.json({ error: 'product_id required' }, { status: 400 });
  }

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', product_id)
    .eq('contractor_id', contractorId)
    .single();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const height = Number(height_ft) || 6;
  const { data: po, error: poErr } = await supabase
    .from('product_options')
    .insert({
      product_id,
      height_ft: height,
      color: color?.trim() || null,
      style_name: style_name?.trim() || null,
      is_active: true,
    })
    .select()
    .single();

  if (poErr) return NextResponse.json({ error: poErr.message }, { status: 500 });

  await supabase.from('pricing_rules').insert({
    contractor_id: contractorId,
    product_option_id: po.id,
    base_price_per_ft_low: 25,
    base_price_per_ft_high: 35,
    single_gate_low: 250,
    single_gate_high: 350,
    double_gate_low: 450,
    double_gate_high: 600,
    removal_price_per_ft_low: 5,
    removal_price_per_ft_high: 5,
    minimum_job_low: 500,
    minimum_job_high: 500,
    is_active: true,
  });

  return NextResponse.json(po);
}
