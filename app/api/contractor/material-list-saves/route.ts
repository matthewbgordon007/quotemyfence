import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser } from '@/lib/contractor-auth-helpers';
import {
  mapFenceSegmentsToLayoutDrawing,
  type MapFenceGate,
  type MapFenceSegment,
} from '@/lib/map-fence-to-layout-drawing';

export async function GET() {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('contractor_material_list_saves')
    .select('id, title, quote_session_id, created_at')
    .eq('contractor_id', cu.contractorId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saves: rows ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.quote_session_id === 'string' ? body.quote_session_id.trim() : '';
  if (!sessionId) return NextResponse.json({ error: 'quote_session_id is required' }, { status: 400 });

  const { data: sess } = await supabase
    .from('quote_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('contractor_id', cu.contractorId)
    .maybeSingle();
  if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const { data: fences } = await supabase.from('fences').select('id, total_length_ft').eq('quote_session_id', sessionId).limit(1);
  const fence = fences?.[0] as { id: string; total_length_ft?: number | null } | undefined;
  if (!fence?.id) return NextResponse.json({ error: 'No fence for this job yet' }, { status: 400 });

  const [{ data: segs }, { data: gateRows }, { data: prop }] = await Promise.all([
    supabase
      .from('fence_segments')
      .select('start_lat, start_lng, end_lat, end_lng, length_ft')
      .eq('fence_id', fence.id)
      .order('sort_order'),
    supabase.from('gates').select('gate_type, quantity, lat, lng').eq('fence_id', fence.id),
    supabase.from('properties').select('formatted_address').eq('quote_session_id', sessionId).maybeSingle(),
  ]);

  if (!segs?.length) return NextResponse.json({ error: 'No map segments to save' }, { status: 400 });

  const drawing_data = mapFenceSegmentsToLayoutDrawing(
    segs as MapFenceSegment[],
    Number(fence.total_length_ft) || 0,
    (gateRows ?? []) as MapFenceGate[]
  );

  const addr = typeof body.title === 'string' ? body.title.trim() : '';
  const title =
    addr ||
    (prop as { formatted_address?: string } | null)?.formatted_address?.trim() ||
    'Material list snapshot';

  const { data: row, error } = await supabase
    .from('contractor_material_list_saves')
    .insert({
      contractor_id: cu.contractorId,
      quote_session_id: sessionId,
      title,
      drawing_data,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: row.id, ok: true });
}
