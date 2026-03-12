/**
 * Seeds a new contractor's catalog from the standard catalog (lib/standard-catalog.json).
 * Run: node scripts/export-standard-catalog.mjs <contractor-slug> to populate the standard catalog.
 * Pricing is set to 0 (blank) - contractor sets their own.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import catalogData from './standard-catalog.json';

interface StandardCatalog {
  types: { name: string; standard_height_ft?: number; display_order?: number }[];
  styles: { type_index: number; style_name: string; photo_url?: string | null; display_order?: number }[];
  colours: { style_index: number; color_name: string; photo_url?: string | null; display_order?: number }[];
}

export async function seedCatalogFromStandard(
  supabaseAdmin: SupabaseClient,
  newContractorId: string
): Promise<{ ok: boolean; error?: string }> {
  const catalog = catalogData as StandardCatalog;
  const types = catalog?.types || [];
  const styles = catalog?.styles || [];
  const colours = catalog?.colours || [];

  if (!types.length) return { ok: true };

  const typeIdMap: string[] = [];

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const { data: newType, error: typeErr } = await supabaseAdmin
      .from('fence_types')
      .insert({
        contractor_id: newContractorId,
        name: t.name,
        standard_height_ft: t.standard_height_ft ?? 6,
        display_order: t.display_order ?? i,
        is_active: true,
      })
      .select('id')
      .single();

    if (typeErr || !newType) {
      console.error('seed-catalog: failed to insert fence_type', t.name, typeErr);
      return { ok: false, error: typeErr?.message };
    }
    typeIdMap[i] = newType.id;
  }

  const styleIdMap: string[] = [];

  for (let i = 0; i < styles.length; i++) {
    const s = styles[i];
    const newTypeId = typeIdMap[s.type_index];
    if (!newTypeId) continue;

    const { data: newStyle, error: styleErr } = await supabaseAdmin
      .from('fence_styles')
      .insert({
        fence_type_id: newTypeId,
        style_name: s.style_name,
        photo_url: s.photo_url || null,
        display_order: s.display_order ?? i,
        is_active: true,
      })
      .select('id')
      .single();

    if (styleErr || !newStyle) {
      console.error('seed-catalog: failed to insert fence_style', s.style_name, styleErr);
      continue;
    }
    styleIdMap[i] = newStyle.id;
  }

  for (const c of colours) {
    const newStyleId = styleIdMap[c.style_index];
    if (!newStyleId) continue;

    const { data: newColour, error: colourErr } = await supabaseAdmin
      .from('colour_options')
      .insert({
        fence_style_id: newStyleId,
        color_name: c.color_name,
        photo_url: c.photo_url || null,
        display_order: c.display_order ?? 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (colourErr || !newColour) {
      console.error('seed-catalog: failed to insert colour', c.color_name, colourErr);
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
