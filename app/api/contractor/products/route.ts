import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
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
  if (!userRow?.contractor_id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: products, error } = await supabase
    .from('products')
    .select(
      `
      *,
      product_options (
        id,
        height_ft,
        color,
        style_name,
        is_active
      )
    `
    )
    .eq('contractor_id', userRow.contractor_id)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productIds = (products || []).flatMap((p: { product_options?: { id: string }[] }) =>
    (p.product_options || []).map((o) => o.id)
  );

  let pricingRules: { product_option_id: string; [k: string]: unknown }[] = [];
  if (productIds.length > 0) {
    const { data: rules } = await supabase
      .from('pricing_rules')
      .select('*')
      .in('product_option_id', productIds);
    pricingRules = rules || [];
  }

  return NextResponse.json({ products: products || [], pricingRules });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id, role')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  if (!userRow?.contractor_id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!['owner', 'admin'].includes(userRow.role || ''))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const body = await request.json();
  const {
    name,
    category,
    material,
    style,
    default_height_ft,
    description,
    options,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Product name required' }, { status: 400 });
  }

  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert({
      contractor_id: userRow.contractor_id,
      name: name.trim(),
      category: category?.trim() || null,
      material: material?.trim() || null,
      style: style?.trim() || null,
      default_height_ft: Number(default_height_ft) || 6,
      description: description?.trim() || null,
      is_active: true,
    })
    .select()
    .single();

  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });

  const opts = Array.isArray(options) ? options : [{ height_ft: 6 }];
  for (const opt of opts) {
    const height = Number(opt.height_ft) || 6;
    const { data: po } = await supabase
      .from('product_options')
      .insert({
        product_id: product.id,
        height_ft: height,
        color: opt.color?.trim() || null,
        style_name: opt.style_name?.trim() || null,
        is_active: true,
      })
      .select('id')
      .single();

    if (po) {
      await supabase.from('pricing_rules').insert({
        contractor_id: userRow.contractor_id,
        product_option_id: po.id,
        base_price_per_ft_low: Number(opt.base_low) || 25,
        base_price_per_ft_high: Number(opt.base_high) || 35,
        single_gate_low: Number(opt.single_gate_low) || 250,
        single_gate_high: Number(opt.single_gate_high) || 350,
        double_gate_low: Number(opt.double_gate_low) || 450,
        double_gate_high: Number(opt.double_gate_high) || 600,
        removal_price_per_ft_low: Number(opt.removal_per_ft_low) || 5,
        removal_price_per_ft_high: Number(opt.removal_per_ft_high) || 5,
        minimum_job_low: Number(opt.min_job_low) || 500,
        minimum_job_high: Number(opt.min_job_high) || 500,
        is_active: true,
      });
    }
  }

  return NextResponse.json(product);
}
