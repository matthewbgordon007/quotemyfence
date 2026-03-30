import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePricing } from '@/lib/pricing';
import { pickBestTierByLength } from '@/lib/length-tier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      total_length_ft,
      product_option_id,
      colour_option_id,
      single_gate_qty,
      double_gate_qty,
      has_removal,
    } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let ruleRow: { base_price_per_ft_low: number; base_price_per_ft_high: number; single_gate_low: number; single_gate_high: number; double_gate_low: number; double_gate_high: number; removal_price_per_ft_low: number; removal_price_per_ft_high: number; minimum_job_low: number; minimum_job_high: number; tax_mode?: string } | null = null;

    if (colour_option_id) {
      const { data: colour } = await supabase
        .from('colour_options')
        .select('fence_style_id, color_name')
        .eq('id', colour_option_id)
        .single();
      if (colour?.fence_style_id) {
        const { data: selectedStyle } = await supabase
          .from('fence_styles')
          .select('fence_type_id')
          .eq('id', colour.fence_style_id)
          .single();

        const totalLengthFt = Number(total_length_ft) || 0;
        if (selectedStyle?.fence_type_id && colour.color_name && totalLengthFt > 0) {
          const { data: siblingStyles } = await supabase
            .from('fence_styles')
            .select('id, style_name')
            .eq('fence_type_id', selectedStyle.fence_type_id)
            .eq('is_active', true);

          if (siblingStyles?.length) {
            const styleIds = siblingStyles.map((s) => s.id);
            const { data: siblingColours } = await supabase
              .from('colour_options')
              .select('id, fence_style_id, color_name')
              .in('fence_style_id', styleIds)
              .eq('color_name', colour.color_name)
              .eq('is_active', true);
            const { data: styleRules } = await supabase
              .from('style_pricing_rules')
              .select('*')
              .in('fence_style_id', styleIds)
              .eq('is_active', true);

            if (siblingColours?.length && styleRules?.length) {
              const rulesByStyle = new Map(styleRules.map((r) => [r.fence_style_id, r]));
              const styleById = new Map(siblingStyles.map((s) => [s.id, s]));
              const tierCandidates = siblingColours
                .map((co) => {
                  const st = styleById.get(co.fence_style_id);
                  const sr = rulesByStyle.get(co.fence_style_id);
                  if (!st || !sr) return null;
                  return { styleName: st.style_name || '', rule: sr };
                })
                .filter((x): x is { styleName: string; rule: typeof styleRules[number] } => !!x);
              const picked = pickBestTierByLength(tierCandidates, totalLengthFt);
              if (picked) ruleRow = picked.rule;
            }
          }
        }

        if (!ruleRow) {
          const { data: styleRule, error: styleErr } = await supabase
            .from('style_pricing_rules')
            .select('*')
            .eq('fence_style_id', colour.fence_style_id)
            .eq('is_active', true)
            .single();
          if (!styleErr && styleRule) ruleRow = styleRule;
        }
      }
      if (!ruleRow) {
        const { data, error } = await supabase
          .from('colour_pricing_rules')
          .select('*')
          .eq('colour_option_id', colour_option_id)
          .eq('is_active', true)
          .single();
        if (!error && data) ruleRow = data;
      }
    } else if (product_option_id) {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('product_option_id', product_option_id)
        .eq('is_active', true)
        .single();
      if (!error && data) ruleRow = data;
    }

    if (!ruleRow || (!colour_option_id && !product_option_id)) {
      return NextResponse.json(
        { error: colour_option_id || product_option_id ? 'Pricing not found for this option' : 'Missing product_option_id or colour_option_id' },
        { status: 400 }
      );
    }

    const optionId = colour_option_id || product_option_id;

    const result = calculatePricing({
      total_length_ft: Number(total_length_ft) || 0,
      product_option_id: optionId,
      single_gate_qty: Number(single_gate_qty) || 0,
      double_gate_qty: Number(double_gate_qty) || 0,
      has_removal: !!has_removal,
      rule: { ...ruleRow, tax_mode: ruleRow.tax_mode ?? 'excluded' },
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('calculate error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
