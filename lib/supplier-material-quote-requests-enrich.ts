import { stripSupplierFromTypeName } from '@/lib/supplier-import-label';

export type MaterialQuoteRequestContractor = {
  company_name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
};

export type MaterialQuoteRequestProject = {
  total_length_ft: number | null;
  design_summary: string | null;
  design_option: { height_ft?: number; type?: string; style?: string; colour?: string } | null;
  has_removal: boolean;
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[];
  gates: { gate_type: string; quantity: number; lat?: number | null; lng?: number | null }[];
  image_data_url: string | null;
  drawing_data: {
    points?: { x: number; y: number }[];
    segments?: { length_ft: number }[];
    gates?: { type: 'single' | 'double'; quantity: number }[];
    total_length_ft?: number;
  } | null;
};

export type MaterialQuoteRequestDto = {
  id: string;
  description: string;
  status: string;
  supplier_response: string | null;
  master_response: string | null;
  created_at: string;
  updated_at: string;
  contractor_id: string;
  quote_session_id: string | null;
  layout_drawing_id: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_content_type?: string | null;
  attachment_size_bytes?: number | null;
  supplier_seen_at?: string | null;
  contractor: MaterialQuoteRequestContractor;
  project: MaterialQuoteRequestProject;
};

type RawFence = {
  total_length_ft: number | null;
  selected_colour_option_id: string | null;
  selected_product_option_id: string | null;
  has_removal?: boolean | null;
};

type RawMaterialQuoteRow = {
  id: string;
  description: string;
  status: string;
  supplier_response: string | null;
  master_response: string | null;
  created_at: string;
  updated_at: string;
  contractor_id: string;
  quote_session_id: string | null;
  layout_drawing_id: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_content_type?: string | null;
  attachment_size_bytes?: number | null;
  supplier_seen_at?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDesignSummary(supabase: any, fence: RawFence | null): Promise<string | null> {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDesignOption(supabase: any, fence: RawFence | null): Promise<MaterialQuoteRequestProject['design_option']> {
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

/** Enrich DB rows into the same JSON shape used by supplier material-quote APIs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enrichMaterialQuoteRequests(supabase: any, rows: RawMaterialQuoteRow[]): Promise<MaterialQuoteRequestDto[]> {
  const contractorIds = Array.from(new Set(rows.map((r) => r.contractor_id)));
  const quoteSessionIds = Array.from(new Set(rows.map((r) => r.quote_session_id).filter(Boolean))) as string[];
  const layoutIds = Array.from(new Set(rows.map((r) => r.layout_drawing_id).filter(Boolean))) as string[];

  let companyById = new Map<string, MaterialQuoteRequestContractor>();
  if (contractorIds.length > 0) {
    const { data: cos } = await supabase
      .from('contractors')
      .select('id, company_name, slug, email, phone')
      .in('id', contractorIds);
    companyById = new Map(
      (cos || []).map((c: { id: string; company_name: string; slug: string | null; email: string | null; phone: string | null }) => [
        c.id,
        { company_name: c.company_name, slug: c.slug, email: c.email, phone: c.phone },
      ])
    );
  }

  let layoutById = new Map<string, { id: string; drawing_data: unknown; image_data_url?: string | null }>();
  if (layoutIds.length > 0) {
    const { data: layouts } = await supabase
      .from('layout_drawings')
      .select('id, drawing_data, image_data_url')
      .in('id', layoutIds);
    layoutById = new Map((layouts || []).map((l: { id: string; drawing_data: unknown; image_data_url?: string | null }) => [l.id, l]));
  }

  let fenceBySessionId = new Map<string, RawFence>();
  if (quoteSessionIds.length > 0) {
    const { data: fences } = await supabase
      .from('fences')
      .select('quote_session_id, total_length_ft, selected_colour_option_id, selected_product_option_id, has_removal')
      .in('quote_session_id', quoteSessionIds);
    fenceBySessionId = new Map(
      (fences || []).map(
        (f: {
          quote_session_id: string;
          total_length_ft: number | null;
          selected_colour_option_id: string | null;
          selected_product_option_id: string | null;
          has_removal?: boolean | null;
        }) => [f.quote_session_id, f]
      )
    );
  }

  let fenceIdBySessionId = new Map<string, string>();
  if (quoteSessionIds.length > 0) {
    const { data: fenceRows } = await supabase
      .from('fences')
      .select('id, quote_session_id')
      .in('quote_session_id', quoteSessionIds);
    fenceIdBySessionId = new Map((fenceRows || []).map((f: { id: string; quote_session_id: string }) => [f.quote_session_id, f.id]));
  }

  const fenceIds = Array.from(new Set(Array.from(fenceIdBySessionId.values()).filter(Boolean)));
  let segmentsByFenceId = new Map<string, MaterialQuoteRequestProject['segments']>();
  let gatesByFenceId = new Map<string, MaterialQuoteRequestProject['gates']>();
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

  return Promise.all(
    rows.map(async (r) => {
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
          drawing_data: (layout?.drawing_data as MaterialQuoteRequestProject['drawing_data']) ?? null,
        },
      };
    })
  );
}
