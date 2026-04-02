import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type GateRow = { gate_type: string; quantity: number; lat: number | null; lng: number | null };

function segmentsToDrawing(
  segments: {
    sort_order: number;
    start_lat: number;
    start_lng: number;
    end_lat: number;
    end_lng: number;
    length_ft: number;
  }[]
): { points: { lat: number; lng: number }[]; segments: { length_ft: number }[]; total_length_ft: number } | null {
  if (!segments.length) return null;
  const ordered = [...segments].sort((a, b) => a.sort_order - b.sort_order);
  const points: { lat: number; lng: number }[] = [
    { lat: Number(ordered[0].start_lat), lng: Number(ordered[0].start_lng) },
  ];
  const segLengths: { length_ft: number }[] = [];
  let total = 0;
  for (const s of ordered) {
    points.push({ lat: Number(s.end_lat), lng: Number(s.end_lng) });
    const ft = Number(s.length_ft) || 0;
    segLengths.push({ length_ft: Math.round(ft * 100) / 100 });
    total += ft;
  }
  return {
    points,
    segments: segLengths,
    total_length_ft: Math.round(total * 100) / 100,
  };
}

function gatesToClient(gateRows: GateRow[]): { type: 'single' | 'double'; quantity: number; lat?: number; lng?: number }[] {
  const out: { type: 'single' | 'double'; quantity: number; lat?: number; lng?: number }[] = [];
  for (const row of gateRows) {
    const qty = Number(row.quantity) || 0;
    if (qty <= 0) continue;
    const type = row.gate_type === 'double' ? 'double' : 'single';
    out.push({
      type,
      quantity: qty,
      lat: row.lat != null ? Number(row.lat) : undefined,
      lng: row.lng != null ? Number(row.lng) : undefined,
    });
  }
  return out;
}

/**
 * Load quote session for client hydration. Requires ?slug=contractorSlug so sessions cannot be scraped cross-tenant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const slug = request.nextUrl.searchParams.get('slug')?.trim();
    if (!sessionId || !slug) {
      return NextResponse.json({ error: 'Missing session id or slug' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: contractor, error: cErr } = await supabase
      .from('contractors')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (cErr || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const { data: session, error: sErr } = await supabase
      .from('quote_sessions')
      .select('id, contractor_id, status, current_step')
      .eq('id', sessionId)
      .single();

    if (sErr || !session || session.contractor_id !== contractor.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const [{ data: customer }, { data: property }, { data: fences }, { data: totalsRow }] = await Promise.all([
      supabase.from('customers').select('*').eq('quote_session_id', sessionId).maybeSingle(),
      supabase.from('properties').select('*').eq('quote_session_id', sessionId).maybeSingle(),
      supabase.from('fences').select('*').eq('quote_session_id', sessionId).order('created_at', { ascending: false }).limit(1),
      supabase.from('quote_totals').select('*').eq('quote_session_id', sessionId).maybeSingle(),
    ]);

    const fence = fences?.[0] ?? null;
    let drawing: {
      points: { lat: number; lng: number }[];
      segments: { length_ft: number }[];
      gates: { type: 'single' | 'double'; quantity: number; lat?: number; lng?: number }[];
      total_length_ft: number;
    } | null = null;

    if (fence) {
      const { data: segRows } = await supabase
        .from('fence_segments')
        .select('sort_order, start_lat, start_lng, end_lat, end_lng, length_ft')
        .eq('fence_id', fence.id)
        .order('sort_order', { ascending: true });

      const { data: gateRows } = await supabase.from('gates').select('gate_type, quantity, lat, lng').eq('fence_id', fence.id);

      const base = segRows?.length ? segmentsToDrawing(segRows) : null;
      const gates = gatesToClient((gateRows || []) as GateRow[]);
      if (base) {
        drawing = {
          ...base,
          gates,
        };
      }
    }

    const contact = customer
      ? {
          firstName: customer.first_name ?? '',
          lastName: customer.last_name ?? '',
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          leadSource: customer.lead_source ?? '',
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          leadSource: '',
        };

    const prop = property
      ? {
          formattedAddress: property.formatted_address ?? '',
          lat: property.latitude != null ? Number(property.latitude) : null,
          lng: property.longitude != null ? Number(property.longitude) : null,
          placeId: property.place_id ?? null,
        }
      : null;

    const totals =
      totalsRow && totalsRow.total_low != null && totalsRow.total_high != null
        ? {
            subtotal_low: Number(totalsRow.subtotal_low) || 0,
            subtotal_high: Number(totalsRow.subtotal_high) || 0,
            total_low: Number(totalsRow.total_low) || 0,
            total_high: Number(totalsRow.total_high) || 0,
          }
        : null;

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      current_step: session.current_step,
      contact,
      property: prop,
      drawing,
      hasRemoval: !!fence?.has_removal,
      selectedProductOptionId: fence?.selected_product_option_id ?? null,
      selectedColourOptionId: fence?.selected_colour_option_id ?? null,
      totals,
    });
  } catch (e) {
    console.error('quote-session GET error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
