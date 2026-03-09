import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    supabase.from('saved_quotes').select('id, created_at, grand_total').eq('quote_session_id', sessionId).order('created_at', { ascending: false }),
  ]);

  const fence = fences?.[0];
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
  });
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
