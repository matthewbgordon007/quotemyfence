import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function segmentsToDrawing(
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[],
  totalLengthFt: number,
  gates: { gate_type: string; quantity: number }[]
) {
  if (!segments?.length) {
    return { points: [], segments: [], gates: gates.map((g) => ({ type: g.gate_type, quantity: g.quantity || 0 })), total_length_ft: totalLengthFt };
  }
  const METERS_PER_DEG_LAT = 111320;
  const refLat = Number(segments[0].start_lat);
  const refLng = Number(segments[0].start_lng);
  const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  const M_TO_FT = 3.28084;

  function toFeet(lat: number, lng: number) {
    const dx = (lng - refLng) * metersPerDegLng;
    const dy = (lat - refLat) * METERS_PER_DEG_LAT;
    return { x: dx * M_TO_FT, y: -dy * M_TO_FT };
  }

  const points: { x: number; y: number }[] = [];
  const segLengths: { length_ft: number }[] = [];
  for (const seg of segments) {
    if (points.length === 0) points.push(toFeet(Number(seg.start_lat), Number(seg.start_lng)));
    points.push(toFeet(Number(seg.end_lat), Number(seg.end_lng)));
    if (seg.length_ft != null) segLengths.push({ length_ft: Number(seg.length_ft) });
  }
  const total = totalLengthFt > 0 ? totalLengthFt : segLengths.reduce((s, x) => s + x.length_ft, 0);
  return {
    points,
    segments: segLengths.length > 0 ? segLengths : points.length >= 2 ? [{ length_ft: total }] : [],
    gates: gates.map((g) => ({ type: g.gate_type, quantity: g.quantity || 0 })),
    total_length_ft: total,
  };
}

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return ur?.contractor_id ?? null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { layout_drawing_id, quote_session_id, description, supplier_contractor_id: rawSupplier } = body;
  const supplierContractorId =
    rawSupplier && String(rawSupplier).trim() && String(rawSupplier).trim() !== 'master'
      ? String(rawSupplier).trim()
      : null;

  let layoutId = layout_drawing_id ?? body.layoutId;
  let sessionId = quote_session_id ?? body.quote_session_id;
  const desc = String(description ?? '').trim();

  const descFinal = desc || 'No specifications provided.';

  if (sessionId && !layoutId) {
    const { data: sess } = await supabase
      .from('quote_sessions')
      .select('id, layout_drawing_id')
      .eq('id', sessionId)
      .eq('contractor_id', contractorId)
      .single();

    if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    layoutId = (sess as { layout_drawing_id?: string }).layout_drawing_id ?? null;

    if (!layoutId) {
      const { data: fences } = await supabase.from('fences').select('id, total_length_ft').eq('quote_session_id', sessionId);
      const fence = fences?.[0];
      if (!fence) return NextResponse.json({ error: 'No fence or layout for this customer. Draw a layout first.' }, { status: 400 });

      const { data: segs } = await supabase
        .from('fence_segments')
        .select('start_lat, start_lng, end_lat, end_lng, length_ft')
        .eq('fence_id', fence.id)
        .order('sort_order');
      const { data: gateRows } = await supabase.from('gates').select('gate_type, quantity').eq('fence_id', fence.id);
      const gates = gateRows ?? [];
      const drawingData = segmentsToDrawing(segs ?? [], Number(fence.total_length_ft) || 0, gates);

      const { data: newLayout, error: layoutCreateErr } = await supabase
        .from('layout_drawings')
        .insert({
          contractor_id: contractorId,
          title: `Customer layout`,
          drawing_data: drawingData,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (layoutCreateErr || !newLayout) return NextResponse.json({ error: 'Failed to create layout' }, { status: 500 });
      layoutId = newLayout.id;
      await supabase.from('quote_sessions').update({ layout_drawing_id: layoutId }).eq('id', sessionId);
    }
  }

  if (!layoutId && !sessionId) return NextResponse.json({ error: 'Layout or session is required' }, { status: 400 });

  if (!sessionId && layoutId) {
    const { data: sess } = await supabase
      .from('quote_sessions')
      .select('id')
      .eq('layout_drawing_id', layoutId)
      .limit(1)
      .single();
    sessionId = sess?.id ?? null;
  }

  const { data: layout, error: layoutErr } = await supabase
    .from('layout_drawings')
    .select('id, contractor_id')
    .eq('id', layoutId)
    .eq('contractor_id', contractorId)
    .single();

  if (layoutErr || !layout) return NextResponse.json({ error: 'Layout not found' }, { status: 404 });

  if (supplierContractorId) {
    const { data: tgt } = await supabase
      .from('contractors')
      .select('account_type')
      .eq('id', supplierContractorId)
      .eq('is_active', true)
      .single();
    if (!tgt || tgt.account_type !== 'supplier') {
      return NextResponse.json({ error: 'Invalid supplier' }, { status: 400 });
    }
    const { data: rel } = await supabase
      .from('contractor_supplier_links')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('supplier_contractor_id', supplierContractorId)
      .maybeSingle();
    if (!rel) return NextResponse.json({ error: 'Link that supplier on the Suppliers page first' }, { status: 403 });
  }

  const { data: req, error } = await supabase
    .from('material_quote_requests')
    .insert({
      layout_drawing_id: layout.id,
      quote_session_id: sessionId || null,
      contractor_id: contractorId,
      supplier_contractor_id: supplierContractorId,
      description: descFinal,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: req.id, ok: true });
}
