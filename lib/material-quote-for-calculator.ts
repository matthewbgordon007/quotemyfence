import type { SupabaseClient } from '@supabase/supabase-js';

export type MaterialQuoteCalculatorBootstrap = {
  materialQuoteId: string;
  customerId: string | null;
  quoteSessionId: string | null;
  homeownerName: string | null;
  quoteAddress: string | null;
  mapCenter: [number, number] | null;
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[];
  gates: { gate_type: string; quantity: number; lat?: number | null; lng?: number | null }[];
  selectedColourOptionId: string | null;
  supplierMaterialList: unknown;
  materialPricing: {
    pricePerFtOverride: number | null;
    singleGateOverride: number | null;
    doubleGateOverride: number | null;
    minJobOverride: number | null;
  } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildMaterialQuoteCalculatorBootstrap(
  supabase: SupabaseClient,
  materialQuoteId: string,
  buyerContractorId: string
): Promise<{ ok: true; data: MaterialQuoteCalculatorBootstrap } | { ok: false; status: number; error: string }> {
  const { data: mq, error: mqErr } = await supabase
    .from('material_quote_requests')
    .select(
      'id, contractor_id, supplier_contractor_id, quote_session_id, layout_drawing_id, supplier_material_list_json'
    )
    .eq('id', materialQuoteId)
    .eq('contractor_id', buyerContractorId)
    .maybeSingle();

  if (mqErr) return { ok: false, status: 500, error: mqErr.message };
  if (!mq) return { ok: false, status: 404, error: 'Not found' };

  const quoteSessionId = mq.quote_session_id as string | null;
  let customerId: string | null = null;
  let homeownerName: string | null = null;
  let quoteAddress: string | null = null;
  let mapCenter: [number, number] | null = null;
  const segments: MaterialQuoteCalculatorBootstrap['segments'] = [];
  const gates: MaterialQuoteCalculatorBootstrap['gates'] = [];
  let selectedColourOptionId: string | null = null;

  if (quoteSessionId) {
    const { data: cust } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .eq('quote_session_id', quoteSessionId)
      .maybeSingle();
    if (cust) {
      customerId = cust.id as string;
      const fn = (cust as { first_name?: string }).first_name || '';
      const ln = (cust as { last_name?: string }).last_name || '';
      homeownerName = `${fn} ${ln}`.trim() || null;
    }

    const { data: prop } = await supabase
      .from('properties')
      .select('formatted_address, latitude, longitude')
      .eq('quote_session_id', quoteSessionId)
      .maybeSingle();
    if (prop) {
      quoteAddress = (prop as { formatted_address?: string }).formatted_address || null;
      const lat = (prop as { latitude?: number }).latitude;
      const lng = (prop as { longitude?: number }).longitude;
      if (lat != null && lng != null) mapCenter = [Number(lat), Number(lng)];
    }

    const { data: fence } = await supabase
      .from('fences')
      .select('id, selected_colour_option_id')
      .eq('quote_session_id', quoteSessionId)
      .limit(1)
      .maybeSingle();

    if (fence) {
      selectedColourOptionId = (fence as { selected_colour_option_id?: string }).selected_colour_option_id ?? null;
      const fenceId = fence.id as string;
      const { data: segs } = await supabase
        .from('fence_segments')
        .select('start_lat, start_lng, end_lat, end_lng, length_ft')
        .eq('fence_id', fenceId)
        .order('sort_order');
      if (segs?.length) {
        for (const s of segs) {
          segments.push({
            start_lat: Number((s as { start_lat: number }).start_lat),
            start_lng: Number((s as { start_lng: number }).start_lng),
            end_lat: Number((s as { end_lat: number }).end_lat),
            end_lng: Number((s as { end_lng: number }).end_lng),
            length_ft: (s as { length_ft?: number }).length_ft != null ? Number((s as { length_ft?: number }).length_ft) : undefined,
          });
        }
      }
      const { data: gateRows } = await supabase
        .from('gates')
        .select('gate_type, quantity, lat, lng')
        .eq('fence_id', fenceId);
      if (gateRows?.length) {
        for (const g of gateRows) {
          gates.push({
            gate_type: String((g as { gate_type: string }).gate_type),
            quantity: Number((g as { quantity: number }).quantity) || 0,
            lat: (g as { lat?: number | null }).lat ?? null,
            lng: (g as { lng?: number | null }).lng ?? null,
          });
        }
      }
    }
  }

  const supplierId = mq.supplier_contractor_id as string | null;
  let materialPricing: MaterialQuoteCalculatorBootstrap['materialPricing'] = null;

  if (supplierId && selectedColourOptionId) {
    const { data: colour } = await supabase
      .from('colour_options')
      .select('fence_style_id')
      .eq('id', selectedColourOptionId)
      .maybeSingle();
    const buyerStyleId = colour?.fence_style_id as string | undefined;
    if (buyerStyleId) {
      const { data: imp } = await supabase
        .from('imported_supplier_styles')
        .select('supplier_fence_style_id')
        .eq('buyer_contractor_id', buyerContractorId)
        .eq('supplier_contractor_id', supplierId)
        .eq('buyer_fence_style_id', buyerStyleId)
        .maybeSingle();
      const supplierStyleId = imp?.supplier_fence_style_id as string | undefined;
      if (supplierStyleId) {
        const { data: rule } = await supabase
          .from('style_pricing_rules')
          .select(
            'contractor_material_price_per_ft, contractor_material_single_gate, contractor_material_double_gate, contractor_material_minimum_job'
          )
          .eq('fence_style_id', supplierStyleId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (rule) {
          const perFt = Number((rule as { contractor_material_price_per_ft?: number }).contractor_material_price_per_ft);
          const sg = Number((rule as { contractor_material_single_gate?: number }).contractor_material_single_gate);
          const dg = Number((rule as { contractor_material_double_gate?: number }).contractor_material_double_gate);
          const mj = Number((rule as { contractor_material_minimum_job?: number }).contractor_material_minimum_job);
          materialPricing = {
            pricePerFtOverride: Number.isFinite(perFt) && perFt > 0 ? perFt : null,
            singleGateOverride: Number.isFinite(sg) && sg > 0 ? sg : null,
            doubleGateOverride: Number.isFinite(dg) && dg > 0 ? dg : null,
            minJobOverride: Number.isFinite(mj) && mj > 0 ? mj : null,
          };
          if (
            !materialPricing.pricePerFtOverride &&
            !materialPricing.singleGateOverride &&
            !materialPricing.doubleGateOverride &&
            !materialPricing.minJobOverride
          ) {
            materialPricing = null;
          }
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      materialQuoteId: mq.id as string,
      customerId,
      quoteSessionId,
      homeownerName,
      quoteAddress,
      mapCenter,
      segments,
      gates,
      selectedColourOptionId,
      supplierMaterialList: mq.supplier_material_list_json ?? null,
      materialPricing,
    },
  };
}
