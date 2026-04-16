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

  const requests = await Promise.all(
    (rows || []).map(async (r) => {
      const fence = r.quote_session_id ? fenceBySessionId.get(r.quote_session_id) || null : null;
      const designSummary = await getDesignSummary(supabase, fence);
      const layout = r.layout_drawing_id ? layoutById.get(r.layout_drawing_id) || null : null;
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
          has_removal: fence?.has_removal ?? false,
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
