/**
 * Seeds a new contractor's product catalog from a template contractor (e.g. Gordon Landscaping).
 * Copies: fence_types, fence_styles, colour_options. Pricing is set to 0 (blank) - contractor sets their own.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export async function seedCatalogFromTemplate(
  supabaseAdmin: SupabaseClient,
  newContractorId: string,
  templateContractorSlug: string
): Promise<{ ok: boolean; error?: string }> {
  if (!templateContractorSlug?.trim()) return { ok: true };

  const { data: templateContractor } = await supabaseAdmin
    .from('contractors')
    .select('id')
    .eq('slug', templateContractorSlug.trim())
    .eq('is_active', true)
    .single();

  if (!templateContractor) {
    console.warn(`Template contractor slug "${templateContractorSlug}" not found; new contractor will start with empty catalog.`);
    return { ok: true };
  }

  const templateId = templateContractor.id;

  // Try fence_types by contractor_id (new schema with types-without-heights)
  let { data: templateTypes } = await supabaseAdmin
    .from('fence_types')
    .select('id, name, standard_height_ft, display_order, height_id')
    .eq('contractor_id', templateId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  // Fallback: fence_types via fence_heights (original schema before types-without-heights)
  if (!templateTypes?.length) {
    const { data: heights } = await supabaseAdmin
      .from('fence_heights')
      .select('id')
      .eq('contractor_id', templateId)
      .eq('is_active', true);
    if (heights?.length) {
      const { data: typesViaHeights } = await supabaseAdmin
        .from('fence_types')
        .select('id, name, standard_height_ft, display_order, height_id')
        .in('height_id', heights.map((h) => h.id))
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      templateTypes = typesViaHeights || [];
    }
  }

  if (!templateTypes?.length) {
    console.warn('seed-catalog: template contractor has no fence_types (check Products page has types/styles/colours)');
    return { ok: true };
  }

  const typeIdMap = new Map<string, string>();

  for (const t of templateTypes) {
    const { data: newType, error: typeErr } = await supabaseAdmin
      .from('fence_types')
      .insert({
        contractor_id: newContractorId,
        name: t.name,
        standard_height_ft: t.standard_height_ft ?? 6,
        display_order: t.display_order ?? 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (typeErr || !newType) {
      console.error('seed-catalog: failed to copy fence_type', t.name, typeErr);
      return { ok: false, error: typeErr?.message };
    }
    typeIdMap.set(t.id, newType.id);
  }

  const { data: templateStyles } = await supabaseAdmin
    .from('fence_styles')
    .select('id, fence_type_id, style_name, photo_url, display_order')
    .in('fence_type_id', templateTypes.map((t) => t.id))
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (!templateStyles?.length) {
    return { ok: true };
  }

  const styleIdMap = new Map<string, string>();

  for (const s of templateStyles) {
    const newTypeId = typeIdMap.get(s.fence_type_id);
    if (!newTypeId) continue;

    const { data: newStyle, error: styleErr } = await supabaseAdmin
      .from('fence_styles')
      .insert({
        fence_type_id: newTypeId,
        style_name: s.style_name,
        photo_url: s.photo_url,
        display_order: s.display_order ?? 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (styleErr || !newStyle) {
      console.error('seed-catalog: failed to copy fence_style', s.style_name, styleErr);
      continue;
    }
    styleIdMap.set(s.id, newStyle.id);
  }

  const { data: templateColours } = await supabaseAdmin
    .from('colour_options')
    .select('id, fence_style_id, color_name, photo_url, display_order')
    .in('fence_style_id', templateStyles.map((s) => s.id))
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (!templateColours?.length) {
    return { ok: true };
  }

  for (const c of templateColours) {
    const newStyleId = styleIdMap.get(c.fence_style_id);
    if (!newStyleId) continue;

    const { data: newColour, error: colourErr } = await supabaseAdmin
      .from('colour_options')
      .insert({
        fence_style_id: newStyleId,
        color_name: c.color_name,
        photo_url: c.photo_url,
        display_order: c.display_order ?? 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (colourErr || !newColour) {
      console.error('seed-catalog: failed to copy colour', c.color_name, colourErr);
      continue;
    }

    await supabaseAdmin.from('colour_pricing_rules').insert({
      contractor_id: newContractorId,
      colour_option_id: newColour.id,
      base_price_per_ft_low: 0,
      base_price_per_ft_high: 0,
      single_gate_low: 0,
      single_gate_high: 0,
      double_gate_low: 0,
      double_gate_high: 0,
      removal_price_per_ft_low: 0,
      removal_price_per_ft_high: 0,
      minimum_job_low: 0,
      minimum_job_high: 0,
      is_active: true,
    });
  }

  return { ok: true };
}
