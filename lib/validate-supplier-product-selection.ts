import type { SupabaseClient } from '@supabase/supabase-js';

export type SupplierProductSelection = {
  supplier_fence_type_id: string;
  supplier_fence_style_id?: string | null;
  supplier_colour_option_id?: string | null;
};

export type SupplierProductLabels = {
  type: string;
  style?: string;
  colour?: string;
  height_ft?: number;
};

/** Verify supplier catalog picks belong to the linked supplier and satisfy type → style → colour rules. */
export async function validateSupplierProductSelection(
  supabase: SupabaseClient,
  supplierId: string,
  selection: SupplierProductSelection
): Promise<{ ok: true; labels: SupplierProductLabels } | { ok: false; error: string }> {
  const typeId = String(selection.supplier_fence_type_id || '').trim();
  if (!typeId) return { ok: false, error: 'Pick a product from the supplier catalog before sending.' };

  const { data: fenceType } = await supabase
    .from('fence_types')
    .select('id, name, standard_height_ft, contractor_id, is_active')
    .eq('id', typeId)
    .maybeSingle();

  if (!fenceType || fenceType.contractor_id !== supplierId || !fenceType.is_active) {
    return { ok: false, error: 'Invalid product type for this supplier.' };
  }

  const { data: styles } = await supabase
    .from('fence_styles')
    .select('id, style_name, visibility_target, is_active')
    .eq('fence_type_id', typeId)
    .eq('is_active', true);

  const visibleStyles = (styles || []).filter((s) => {
    const v = (s as { visibility_target?: string | null }).visibility_target;
    return v == null || v === 'both' || v === 'contractors_only';
  });

  const styleId = String(selection.supplier_fence_style_id || '').trim();
  if (visibleStyles.length > 0) {
    if (!styleId) return { ok: false, error: 'Pick a style for this product before sending.' };
    const style = visibleStyles.find((s) => s.id === styleId);
    if (!style) return { ok: false, error: 'Invalid style for this supplier product.' };
  }

  let styleName: string | undefined;
  let colourName: string | undefined;

  if (styleId) {
    const style = visibleStyles.find((s) => s.id === styleId);
    styleName = style?.style_name ?? undefined;

    const { data: colours } = await supabase
      .from('colour_options')
      .select('id, color_name, is_active')
      .eq('fence_style_id', styleId)
      .eq('is_active', true);

    const colourId = String(selection.supplier_colour_option_id || '').trim();
    if ((colours || []).length > 0) {
      if (!colourId) return { ok: false, error: 'Pick a colour for this style before sending.' };
      const colour = (colours || []).find((c) => c.id === colourId);
      if (!colour) return { ok: false, error: 'Invalid colour for this supplier style.' };
      colourName = colour.color_name ?? undefined;
    }
  }

  return {
    ok: true,
    labels: {
      type: fenceType.name,
      style: styleName,
      colour: colourName,
      height_ft:
        fenceType.standard_height_ft != null ? Number(fenceType.standard_height_ft) : undefined,
    },
  };
}
