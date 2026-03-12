import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function segmentsToDrawing(
  segs: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[],
  totalLengthFt: number,
  gateRows: { gate_type: string; quantity: number }[]
): { points: { x: number; y: number }[]; segments: { length_ft: number }[]; gates: { type: string; quantity: number }[]; total_length_ft: number } {
  if (!segs?.length) {
    return { points: [], segments: [], gates: gateRows.map((g) => ({ type: g.gate_type, quantity: g.quantity || 0 })), total_length_ft: totalLengthFt };
  }
  const METERS_PER_DEG_LAT = 111320;
  const refLat = Number(segs[0].start_lat);
  const refLng = Number(segs[0].start_lng);
  const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  const M_TO_FT = 3.28084;
  function toFeet(lat: number, lng: number) {
    const dx = (lng - refLng) * metersPerDegLng;
    const dy = (lat - refLat) * METERS_PER_DEG_LAT;
    return { x: dx * M_TO_FT, y: -dy * M_TO_FT };
  }
  const points: { x: number; y: number }[] = [];
  const segLengths: { length_ft: number }[] = [];
  for (const seg of segs) {
    if (points.length === 0) points.push(toFeet(Number(seg.start_lat), Number(seg.start_lng)));
    points.push(toFeet(Number(seg.end_lat), Number(seg.end_lng)));
    if (seg.length_ft != null) segLengths.push({ length_ft: Number(seg.length_ft) });
  }
  const total = totalLengthFt > 0 ? totalLengthFt : segLengths.reduce((s, x) => s + x.length_ft, 0);
  return {
    points,
    segments: segLengths.length > 0 ? segLengths : points.length >= 2 ? [{ length_ft: total }] : [],
    gates: gateRows.map((g) => ({ type: g.gate_type, quantity: g.quantity || 0 })),
    total_length_ft: total,
  };
}

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session, error: sessionError } = await supabase
    .from('quote_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('contractor_id', contractorId)
    .single();

  if (sessionError || !session)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [
    { data: customer },
    { data: property },
    { data: fences },
    { data: quoteTotals },
    { data: savedQuotes },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('quote_session_id', sessionId).single(),
    supabase.from('properties').select('*').eq('quote_session_id', sessionId).single(),
    supabase.from('fences').select('*').eq('quote_session_id', sessionId),
    supabase.from('quote_totals').select('*').eq('quote_session_id', sessionId).single(),
    supabase.from('saved_quotes').select('id, created_at, grand_total, calculator_state').eq('quote_session_id', sessionId).order('created_at', { ascending: false }),
  ]);

  const fence = fences?.[0];
  let layoutDrawing: { drawing_data: unknown } | null = null;
  const layoutDrawingId = (session as { layout_drawing_id?: string }).layout_drawing_id;
  if (layoutDrawingId) {
    const { data: layout } = await supabase
      .from('layout_drawings')
      .select('drawing_data, image_data_url')
      .eq('id', layoutDrawingId)
      .single();
    if (layout) layoutDrawing = { drawing_data: layout.drawing_data, image_data_url: (layout as { image_data_url?: string }).image_data_url ?? null };
  }

  let segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[] = [];
  let gates: { gate_type: string; quantity: number }[] = [];
  let designSummary: string | null = null;
  let designOption: { height_ft?: number; type?: string; style?: string; colour?: string } | null = null;

  if (fence) {
    const { data: segs } = await supabase
      .from('fence_segments')
      .select('start_lat, start_lng, end_lat, end_lng, length_ft')
      .eq('fence_id', fence.id)
      .order('sort_order');
    segments = segs || [];

    const { data: gateRows } = await supabase
      .from('gates')
      .select('gate_type, quantity, lat, lng')
      .eq('fence_id', fence.id);
    gates = gateRows || [];

    if (fence.selected_colour_option_id) {
      const { data: colour } = await supabase
        .from('colour_options')
        .select('id, color_name, fence_style_id')
        .eq('id', fence.selected_colour_option_id)
        .single();
      if (colour) {
        const { data: style } = await supabase.from('fence_styles').select('id, style_name, fence_type_id').eq('id', colour.fence_style_id).single();
        if (style) {
          const { data: ft } = await supabase.from('fence_types').select('id, name, standard_height_ft').eq('id', style.fence_type_id).single();
          if (ft) {
            const heightFt = ft.standard_height_ft ?? null;
            designOption = {
              height_ft: heightFt != null ? Number(heightFt) : undefined,
              type: ft.name,
              style: style.style_name,
              colour: colour.color_name,
            };
            designSummary = [heightFt != null && `${heightFt} ft`, ft.name, style.style_name, colour.color_name].filter(Boolean).join(' • ');
          }
        }
      }
    } else if (fence.selected_product_option_id) {
      const { data: opt } = await supabase
        .from('product_options')
        .select('id, height_ft, color, style_name, product_id')
        .eq('id', fence.selected_product_option_id)
        .single();
      if (opt) {
        const { data: prod } = await supabase.from('products').select('name').eq('id', opt.product_id).single();
        designOption = {
          height_ft: opt.height_ft,
          type: prod?.name ?? null,
          style: opt.style_name,
          colour: opt.color,
        };
        designSummary = [opt.height_ft && `${opt.height_ft} ft`, prod?.name, opt.style_name, opt.color].filter(Boolean).join(' • ');
      }
    }
  }

  // If no layout from Draw tool but we have fence segments, synthesize layout (canvas format) from map data
  if (!layoutDrawing && segments.length > 0 && fence) {
    const synthesized = segmentsToDrawing(segments, Number(fence.total_length_ft) || 0, gates);
    layoutDrawing = { drawing_data: synthesized };
  }

  return NextResponse.json({
    session,
    customer: customer ?? null,
    property: property ?? null,
    fence: fence ?? null,
    segments,
    gates,
    quoteTotals: quoteTotals ?? null,
    designSummary,
    designOption,
    savedQuotes: savedQuotes ?? [],
    layoutDrawing,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session, error: sessionError } = await supabase
    .from('quote_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('contractor_id', contractorId)
    .single();

  if (sessionError || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const customerUpdates: Record<string, unknown> = {};
  if (body.first_name != null) customerUpdates.first_name = String(body.first_name).trim();
  if (body.last_name != null) customerUpdates.last_name = String(body.last_name).trim();
  if (body.email != null) customerUpdates.email = String(body.email).trim();
  if (body.phone != null) customerUpdates.phone = body.phone ? String(body.phone).trim() : null;
  if (body.lead_source != null) customerUpdates.lead_source = body.lead_source ? String(body.lead_source).trim() : null;

  const propertyUpdates: Record<string, unknown> = {};
  if (body.formatted_address != null) propertyUpdates.formatted_address = String(body.formatted_address).trim() || '—';
  if (body.street_address != null) propertyUpdates.street_address = body.street_address ? String(body.street_address).trim() : null;
  if (body.city != null) propertyUpdates.city = body.city ? String(body.city).trim() : null;
  if (body.province_state != null) propertyUpdates.province_state = body.province_state ? String(body.province_state).trim() : null;
  if (body.postal_zip != null) propertyUpdates.postal_zip = body.postal_zip ? String(body.postal_zip).trim() : null;
  if (body.country != null) propertyUpdates.country = body.country ? String(body.country).trim() : null;

  if (Object.keys(customerUpdates).length > 0) {
    const { error: custErr } = await supabase
      .from('customers')
      .update(customerUpdates)
      .eq('quote_session_id', sessionId)
      .eq('contractor_id', contractorId);
    if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 });
  }

  if (Object.keys(propertyUpdates).length > 0) {
    const { error: propErr } = await supabase
      .from('properties')
      .update(propertyUpdates)
      .eq('quote_session_id', sessionId);
    if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 });
  }

  await supabase
    .from('quote_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', sessionId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session, error: fetchError } = await supabase
    .from('quote_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('contractor_id', contractorId)
    .single();

  if (fetchError || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error: deleteError } = await supabase
    .from('quote_sessions')
    .delete()
    .eq('id', sessionId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
