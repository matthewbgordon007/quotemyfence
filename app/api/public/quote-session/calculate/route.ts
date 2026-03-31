import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePricing } from '@/lib/pricing';
import { pickBestTierByInstallLength, pickBestTierByLength } from '@/lib/length-tier';

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
          .select('*')
          .eq('id', colour.fence_style_id)
          .eq('is_active', true)
          .single();
        if (!selectedStyle || (selectedStyle as { is_hidden?: boolean | null }).is_hidden === true) {
          return NextResponse.json({ error: 'Pricing not found for this option' }, { status: 400 });
        }

        const totalLengthFt = Number(total_length_ft) || 0;

        const { data: installTiers } = await supabase
          .from('style_install_length_tiers')
          .select('*')
          .eq('fence_style_id', colour.fence_style_id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (installTiers?.length && totalLengthFt > 0) {
          const picked = pickBestTierByInstallLength(installTiers, totalLengthFt);
          if (picked) {
            ruleRow = {
              base_price_per_ft_low: Number(picked.base_price_per_ft_low),
              base_price_per_ft_high: Number(picked.base_price_per_ft_high),
              single_gate_low: Number(picked.single_gate_low),
              single_gate_high: Number(picked.single_gate_high),
              double_gate_low: Number(picked.double_gate_low),
              double_gate_high: Number(picked.double_gate_high),
              removal_price_per_ft_low: Number(picked.removal_price_per_ft_low),
              removal_price_per_ft_high: Number(picked.removal_price_per_ft_high),
              minimum_job_low: Number(picked.minimum_job_low),
              minimum_job_high: Number(picked.minimum_job_high),
              tax_mode: picked.tax_mode ?? 'excluded',
            };
          }
        }

        if (!ruleRow && selectedStyle?.fence_type_id && totalLengthFt > 0) {
          const { data: siblingStyles } = await supabase
            .from('fence_styles')
            .select('*')
            .eq('fence_type_id', selectedStyle.fence_type_id)
            .eq('is_active', true);

          const visibleSiblingStyles = (siblingStyles || []).filter(
            (s) => (s as { is_hidden?: boolean | null }).is_hidden !== true
          );

          if (visibleSiblingStyles.length) {
            const styleIds = visibleSiblingStyles.map((s) => s.id);
            const { data: styleRules } = await supabase
              .from('style_pricing_rules')
              .select('*')
              .in('fence_style_id', styleIds)
              .eq('is_active', true);

            if (styleRules?.length) {
              const rulesByStyle = new Map(styleRules.map((r) => [r.fence_style_id, r]));
              const allTierCandidates = visibleSiblingStyles
                .map((st) => {
                  const sr = rulesByStyle.get(st.id);
                  if (!sr) return null;
                  return { styleId: st.id, styleName: st.style_name || '', rule: sr };
                })
                .filter((x): x is { styleId: string; styleName: string; rule: typeof styleRules[number] } => !!x);

              if (allTierCandidates.length) {
                if (colour.color_name) {
                  const { data: siblingColours } = await supabase
                    .from('colour_options')
                    .select('fence_style_id, color_name')
                    .in('fence_style_id', styleIds)
                    .eq('color_name', colour.color_name)
                    .eq('is_active', true);
                  const colorStyleIds = new Set((siblingColours || []).map((c) => c.fence_style_id));
                  const colorCandidates = allTierCandidates.filter((c) => colorStyleIds.has(c.styleId));
                  const colorPick = pickBestTierByLength(colorCandidates, totalLengthFt);
                  if (colorPick) ruleRow = colorPick.rule;
                }
                if (!ruleRow) {
                  const picked = pickBestTierByLength(allTierCandidates, totalLengthFt);
                  if (picked) ruleRow = picked.rule;
                }
              }
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
