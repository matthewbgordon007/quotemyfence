import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function byName<T>(get: (item: T) => string) {
  return (a: T, b: T) => get(a).localeCompare(get(b), undefined, { sensitivity: 'base', numeric: true });
}

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

  const { data: types } = await supabase
    .from('fence_types')
    .select('*')
    .eq('contractor_id', userRow.contractor_id)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const fenceTypes = types || [];
  if (fenceTypes.length === 0) {
    return NextResponse.json({
      heights: [],
      fenceTypes: [],
      fenceStyles: [],
      colourOptions: [],
      colourPricingRules: [],
      stylePricingRules: [],
    });
  }

  const typeIds = fenceTypes.map((t) => t.id);

  const { data: styles } = await supabase
    .from('fence_styles')
    .select('*')
    .in('fence_type_id', typeIds)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const fenceStyles = styles || [];
  const styleIds = fenceStyles.map((s) => s.id);

  const [coloursRes, styleRulesRes] = await Promise.all([
    styleIds.length > 0
      ? supabase
          .from('colour_options')
          .select('*')
          .in('fence_style_id', styleIds)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    styleIds.length > 0
      ? supabase
          .from('style_pricing_rules')
          .select('*')
          .in('fence_style_id', styleIds)
          .eq('is_active', true)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const colourOptions = coloursRes.data || [];
  const stylePricingRules = styleRulesRes.data || [];
  const colourIds = colourOptions.map((c: { id: string }) => c.id);

  let colourPricingRules: { colour_option_id: string; [k: string]: unknown }[] = [];
  if (colourIds.length > 0) {
    const { data: rules } = await supabase
      .from('colour_pricing_rules')
      .select('*')
      .in('colour_option_id', colourIds);
    colourPricingRules = rules || [];
  }

  const sortedFenceTypes = [...fenceTypes].sort(byName((t) => (t as { name?: string }).name || ''));
  const sortedFenceStyles = [...fenceStyles].sort(byName((s) => (s as { style_name?: string }).style_name || ''));
  const sortedColourOptions = [...colourOptions].sort(byName((c) => (c as { color_name?: string }).color_name || ''));

  return NextResponse.json({
    heights: [],
    fenceTypes: sortedFenceTypes,
    fenceStyles: sortedFenceStyles,
    colourOptions: sortedColourOptions,
    colourPricingRules,
    stylePricingRules,
  });
}
