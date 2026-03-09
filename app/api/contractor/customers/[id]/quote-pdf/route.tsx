import React from 'react';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePdfDocument } from '@/lib/quote-pdf-document';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

function buildStaticMapUrl(
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number }[],
  gates: { gate_type: string; quantity: number; lat?: number | null; lng?: number | null }[],
  apiKey: string
): string {
  if (segments.length === 0) return '';
  const coords: { lat: number; lng: number }[] = [];
  segments.forEach((seg, i) => {
    if (i === 0) coords.push({ lat: seg.start_lat, lng: seg.start_lng });
    coords.push({ lat: seg.end_lat, lng: seg.end_lng });
  });
  
  // Revert to original center calculation (average of points)
  const centerLat = coords.reduce((s, p) => s + p.lat, 0) / coords.length;
  const centerLng = coords.reduce((s, p) => s + p.lng, 0) / coords.length;
  
  const pathStr = coords.map((p) => `${p.lat},${p.lng}`).join('|');
  const path = `color:0xeab308|weight:4|${pathStr}`;
  
  let gateMarkers = '';
  gates.forEach(g => {
    if (g.lat != null && g.lng != null) {
      const color = g.gate_type === 'single' ? 'green' : 'blue';
      const label = g.gate_type === 'single' ? 'S' : 'D';
      gateMarkers += `&markers=color:${color}|label:${label}|${g.lat},${g.lng}`;
    }
  });

  // Reverted zoom back to 19
  return `https://maps.googleapis.com/maps/api/staticmap?size=600x350&scale=2&maptype=satellite&center=${centerLat},${centerLng}&zoom=19&path=${encodeURIComponent(path)}${gateMarkers}&key=${apiKey}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(req.url);
  const isPreview = url.searchParams.get('preview') === '1';
  const quoteId = url.searchParams.get('quote_id');
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

  if (sessionError || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let quoteText = (session as { contractor_quote_text?: string | null }).contractor_quote_text;
  let savedAt = (session as { contractor_quote_saved_at?: string | null }).contractor_quote_saved_at ?? null;

  if (quoteId) {
    const { data: savedQuote } = await supabase
      .from('saved_quotes')
      .select('quote_text, created_at')
      .eq('id', quoteId)
      .eq('quote_session_id', sessionId)
      .single();
    if (savedQuote) {
      quoteText = savedQuote.quote_text;
      savedAt = savedQuote.created_at;
    }
  }

  if (!quoteText) return NextResponse.json({ error: 'No saved quote' }, { status: 400 });

  const [
    { data: customer },
    { data: property },
    { data: contractor },
    { data: fences },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('quote_session_id', sessionId).single(),
    supabase.from('properties').select('*').eq('quote_session_id', sessionId).single(),
    supabase.from('contractors').select('company_name, phone, website, logo_url').eq('id', contractorId).single(),
    supabase.from('fences').select('*').eq('quote_session_id', sessionId),
  ]);

  const fence = fences?.[0] ?? null;
  let segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[] = [];
  let gates: { gate_type: string; quantity: number }[] = [];
  let designSummary: string | null = null;
  let colourPhotoUrl: string | null = null;
  let colourName: string | null = null;

  if (fence) {
    const { data: segs } = await supabase
      .from('fence_segments')
      .select('start_lat, start_lng, end_lat, end_lng, length_ft')
      .eq('fence_id', fence.id)
      .order('sort_order');
    segments = segs || [];
    const { data: gateRows } = await supabase.from('gates').select('gate_type, quantity').eq('fence_id', fence.id);
    gates = gateRows || [];

    if (fence.selected_colour_option_id) {
      const { data: colour } = await supabase.from('colour_options').select('color_name, fence_style_id, photo_url').eq('id', fence.selected_colour_option_id).single();
      if (colour) {
        colourPhotoUrl = (colour as { photo_url?: string | null }).photo_url ?? null;
        colourName = colour.color_name;
        const { data: style } = await supabase.from('fence_styles').select('style_name, fence_type_id').eq('id', colour.fence_style_id).single();
        if (style) {
          const { data: ft } = await supabase.from('fence_types').select('name, standard_height_ft').eq('id', style.fence_type_id).single();
          if (ft) {
            designSummary = [
              ft.standard_height_ft != null && `${ft.standard_height_ft} ft`,
              ft.name,
              style.style_name,
              colour.color_name,
            ].filter(Boolean).join(' • ');
          }
        }
      }
    } else if (fence.selected_product_option_id) {
      const { data: opt } = await supabase.from('product_options').select('height_ft, color, style_name, product_id').eq('id', fence.selected_product_option_id).single();
      if (opt) {
        const { data: prod } = await supabase.from('products').select('name').eq('id', opt.product_id).single();
        designSummary = [opt.height_ft && `${opt.height_ft} ft`, prod?.name, opt.style_name, opt.color].filter(Boolean).join(' • ');
      }
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapImageUrl = apiKey && segments.length >= 2 ? buildStaticMapUrl(segments, gates, apiKey) : null;

  const pdfData = {
    contractor: contractor ?? { company_name: 'Your Contractor', phone: null, website: null, logo_url: null },
    customer: customer ?? { first_name: '', last_name: '', email: '', phone: null },
    property: property ?? { formatted_address: '', city: null, province_state: null, postal_zip: null },
    fence: fence ? { total_length_ft: fence.total_length_ft, has_removal: fence.has_removal } : null,
    segments,
    gates,
    designSummary,
    colourPhotoUrl,
    colourName,
    quoteText,
    savedAt,
    mapImageUrl,
  };

  try {
    const buffer = await renderToBuffer(<QuotePdfDocument data={pdfData} />);
    const disposition = isPreview
      ? 'inline'
      : `attachment; filename="quote-${customer?.first_name ?? 'customer'}-${sessionId.slice(0, 8)}.pdf"`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    });
  } catch (e) {
    console.error('Quote PDF error:', e);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
