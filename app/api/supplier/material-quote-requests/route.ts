import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';
import { stripSupplierFromTypeName } from '@/lib/supplier-import-label';

async function getDesignSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fence: { selected_colour_option_id?: string | null; selected_product_option_id?: string | null } | null
): Promise<string | null> {
  try {
    if (!fence) return null;
    if (fence.selected_colour_option_id) {
      const { data: colour } = await supabase
        .from('colour_options')
        .select('color_name, fence_style_id')
        .eq('id', fence.selected_colour_option_id)
        .single();
      if (colour?.fence_style_id) {
        const { data: style } = await supabase
          .from('fence_styles')
          .select('style_name, fence_type_id')
          .eq('id', colour.fence_style_id)
          .single();
        if (style?.fence_type_id) {
          const { data: ft } = await supabase
            .from('fence_types')
            .select('name, standard_height_ft')
            .eq('id', style.fence_type_id)
            .single();
          const parts = [
            ft?.standard_height_ft != null ? `${ft.standard_height_ft} ft` : null,
            ft?.name ? stripSupplierFromTypeName(ft.name) : null,
            style.style_name,
            colour.color_name,
          ].filter(Boolean);
          return parts.join(' • ') || null;
        }
      }
    }
    if (fence.selected_product_option_id) {
      const { data: opt } = await supabase
        .from('product_options')
        .select('height_ft, color, style_name, product_id')
        .eq('id', fence.selected_product_option_id)
        .single();
      if (opt?.product_id) {
        const { data: prod } = await supabase.from('products').select('name').eq('id', opt.product_id).single();
        const parts = [opt.height_ft ? `${opt.height_ft} ft` : null, prod?.name, opt.style_name, opt.color].filter(Boolean);
        return parts.join(' • ') || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getDesignOption(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fence: { selected_colour_option_id?: string | null; selected_product_option_id?: string | null } | null
): Promise<{ height_ft?: number; type?: string; style?: string; colour?: string } | null> {
  try {
    if (!fence) return null;
    if (fence.selected_colour_option_id) {
      const { data: colour } = await supabase
        .from('colour_options')
        .select('color_name, fence_style_id')
        .eq('id', fence.selected_colour_option_id)
        .single();
      if (colour?.fence_style_id) {
        const { data: style } = await supabase
          .from('fence_styles')
          .select('style_name, fence_type_id')
          .eq('id', colour.fence_style_id)
          .single();
        if (style?.fence_type_id) {
          const { data: ft } = await supabase
            .from('fence_types')
            .select('name, standard_height_ft')
            .eq('id', style.fence_type_id)
            .single();
          return {
            height_ft: ft?.standard_height_ft != null ? Number(ft.standard_height_ft) : undefined,
            type: ft?.name ? stripSupplierFromTypeName(ft.name) : undefined,
            style: style.style_name ?? undefined,
            colour: colour.color_name ?? undefined,
          };
        }
      }
    }
    if (fence.selected_product_option_id) {
      const { data: opt } = await supabase
        .from('product_options')
        .select('height_ft, color, style_name, product_id')
        .eq('id', fence.selected_product_option_id)
        .single();
      if (opt?.product_id) {
        const { data: prod } = await supabase.from('products').select('name').eq('id', opt.product_id).single();
        return {
          height_ft: opt.height_ft != null ? Number(opt.height_ft) : undefined,
          type: prod?.name ?? undefined,
          style: opt.style_name ?? undefined,
          colour: opt.color ?? undefined,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Layout + material quote requests assigned to this supplier. */
export async function GET() {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('material_quote_requests')
    .select(
      'id, description, status, supplier_response, master_response, created_at, updated_at, contractor_id, quote_session_id, layout_drawing_id, attachment_url, attachment_name, attachment_content_type, attachment_size_bytes, supplier_seen_at'
    )
    .eq('supplier_contractor_id', sess.contractorId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contractorIds = Array.from(new Set((rows || []).map((r) => r.contractor_id)));
  const quoteSessionIds = Array.from(new Set((rows || []).map((r) => r.quote_session_id).filter(Boolean)));
  const layoutIds = Array.from(new Set((rows || []).map((r) => r.layout_drawing_id).filter(Boolean)));

  let companyById = new Map<string, { company_name: string; slug: string | null; email: string | null; phone: string | null }>();
  if (contractorIds.length > 0) {
    const { data: cos } = await supabase
      .from('contractors')
      .select('id, company_name, slug, email, phone')
      .in('id', contractorIds);
    companyById = new Map((cos || []).map((c) => [c.id, c]));
  }

  let layoutById = new Map<string, { id: string; drawing_data: unknown; image_data_url?: string | null }>();
  if (layoutIds.length > 0) {
    const { data: layouts } = await supabase
      .from('layout_drawings')
      .select('id, drawing_data, image_data_url')
      .in('id', layoutIds);
    layoutById = new Map((layouts || []).map((l) => [l.id, l]));
  }

  let fenceBySessionId = new Map<
    string,
    { total_length_ft: number | null; selected_colour_option_id: string | null; selected_product_option_id: string | null; has_removal?: boolean | null }
  >();
  if (quoteSessionIds.length > 0) {
    const { data: fences } = await supabase
      .from('fences')
      .select('quote_session_id, total_length_ft, selected_colour_option_id, selected_product_option_id, has_removal')
      .in('quote_session_id', quoteSessionIds);
    fenceBySessionId = new Map((fences || []).map((f) => [f.quote_session_id, f]));
  }

  let fenceIdBySessionId = new Map<string, string>();
  if (quoteSessionIds.length > 0) {
    const { data: fenceRows } = await supabase
      .from('fences')
      .select('id, quote_session_id')
      .in('quote_session_id', quoteSessionIds);
    fenceIdBySessionId = new Map((fenceRows || []).map((f) => [f.quote_session_id, f.id]));
  }

  const fenceIds = Array.from(new Set(Array.from(fenceIdBySessionId.values()).filter(Boolean)));
  let segmentsByFenceId = new Map<
    string,
    { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[]
  >();
  let gatesByFenceId = new Map<string, { gate_type: string; quantity: number; lat?: number | null; lng?: number | null }[]>();
  if (fenceIds.length > 0) {
    const [{ data: segmentRows }, { data: gateRows }] = await Promise.all([
      supabase
        .from('fence_segments')
        .select('fence_id, start_lat, start_lng, end_lat, end_lng, length_ft, sort_order')
        .in('fence_id', fenceIds)
        .order('sort_order', { ascending: true }),
      supabase.from('gates').select('fence_id, gate_type, quantity, lat, lng').in('fence_id', fenceIds),
    ]);

    for (const row of segmentRows || []) {
      const list = segmentsByFenceId.get(row.fence_id) || [];
      list.push({
        start_lat: row.start_lat,
        start_lng: row.start_lng,
        end_lat: row.end_lat,
        end_lng: row.end_lng,
        length_ft: row.length_ft ?? undefined,
      });
      segmentsByFenceId.set(row.fence_id, list);
    }
    for (const row of gateRows || []) {
      const list = gatesByFenceId.get(row.fence_id) || [];
      list.push({
        gate_type: row.gate_type,
        quantity: row.quantity,
        lat: row.lat,
        lng: row.lng,
      });
      gatesByFenceId.set(row.fence_id, list);
    }
  }

  const requests = await Promise.all(
    (rows || []).map(async (r) => {
      const fence = r.quote_session_id ? fenceBySessionId.get(r.quote_session_id) || null : null;
      const designSummary = await getDesignSummary(supabase, fence);
      const designOption = await getDesignOption(supabase, fence);
      const layout = r.layout_drawing_id ? layoutById.get(r.layout_drawing_id) || null : null;
      const fenceId = r.quote_session_id ? fenceIdBySessionId.get(r.quote_session_id) || null : null;
      return {
        ...r,
        contractor: companyById.get(r.contractor_id) || {
          company_name: 'Contractor',
          slug: null,
          email: null,
          phone: null,
        },
        project: {
          total_length_ft: fence?.total_length_ft ?? null,
          design_summary: designSummary,
          design_option: designOption,
          has_removal: fence?.has_removal ?? false,
          segments: fenceId ? segmentsByFenceId.get(fenceId) || [] : [],
          gates: fenceId ? gatesByFenceId.get(fenceId) || [] : [],
          image_data_url: layout?.image_data_url ?? null,
          drawing_data: (layout?.drawing_data as {
            points?: { x: number; y: number }[];
            segments?: { length_ft: number }[];
            gates?: { type: 'single' | 'double'; quantity: number }[];
            total_length_ft?: number;
          } | null) ?? null,
        },
      };
    })
  );

  return NextResponse.json({
    requests,
  });
}
