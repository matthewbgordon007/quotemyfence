import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePricing } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userRow } = await supabase
      .from('users')
      .select('contractor_id')
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .single();
    if (!userRow?.contractor_id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const {
      total_length_ft,
      product_option_id,
      single_gate_qty,
      double_gate_qty,
      has_removal,
    } = body;

    if (!product_option_id) {
      return NextResponse.json(
        { error: 'product_option_id required' },
        { status: 400 }
      );
    }

    const { data: optionRow } = await supabase
      .from('product_options')
      .select('id, product_id')
      .eq('id', product_option_id)
      .single();
    if (!optionRow) {
      return NextResponse.json(
        { error: 'Product option not found' },
        { status: 404 }
      );
    }

    const { data: productRow } = await supabase
      .from('products')
      .select('contractor_id')
      .eq('id', optionRow.product_id)
      .single();
    if (!productRow || productRow.contractor_id !== userRow.contractor_id) {
      return NextResponse.json(
        { error: 'Product option not found' },
        { status: 404 }
      );
    }

    const [{ data: ruleRow }, { data: contractorRow }] = await Promise.all([
      supabase
      .from('pricing_rules')
      .select('*')
      .eq('product_option_id', product_option_id)
      .eq('is_active', true)
      .single(),
      supabase.from('contractors').select('*').eq('id', userRow.contractor_id).single(),
    ]);

    if (!ruleRow) {
      return NextResponse.json(
        { error: 'Pricing not found for this option' },
        { status: 400 }
      );
    }

    const result = calculatePricing({
      total_length_ft: Number(total_length_ft) || 0,
      product_option_id,
      single_gate_qty: Number(single_gate_qty) || 0,
      double_gate_qty: Number(double_gate_qty) || 0,
      has_removal: !!has_removal,
      quote_range_pct: Number((contractorRow as { quote_range_pct?: number | null } | null)?.quote_range_pct ?? 5),
      rule: { ...ruleRow, tax_mode: ruleRow.tax_mode ?? 'excluded' },
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('contractor calculate error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
