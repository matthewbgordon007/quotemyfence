import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function roundUpFeet(feet: number): number {
  if (!Number.isFinite(feet) || feet <= 0) return 0;
  return Math.ceil(feet);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { points, segments, gates, total_length_ft, has_removal } = body;

    if (!sessionId || !Array.isArray(points) || points.length < 2) {
      return NextResponse.json(
        { error: 'Missing session id or invalid drawing (need at least 2 points)' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const segs = Array.isArray(segments) ? segments : [];
    const normalizedSegmentLengths = segs.map((seg: { length_ft?: number }) =>
      roundUpFeet(Number(seg?.length_ft))
    );
    const normalizedTotalLength = normalizedSegmentLengths.reduce((sum, ft) => sum + ft, 0);
    const fallbackTotalLength = roundUpFeet(Number(total_length_ft));
    const fenceTotalLength = normalizedTotalLength > 0 ? normalizedTotalLength : fallbackTotalLength;

    const { data: fence, error: fenceError } = await supabase
      .from('fences')
      .insert({
        quote_session_id: sessionId,
        label: 'Main',
        total_length_ft: fenceTotalLength,
        has_removal: !!has_removal,
      })
      .select('id')
      .single();

    if (fenceError || !fence) {
      console.error('fences insert error:', fenceError);
      return NextResponse.json({ error: 'Failed to save fence' }, { status: 500 });
    }

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const start = points[i];
      const end = points[i + 1];
      if (!start || !end) continue;
      await supabase.from('fence_segments').insert({
        fence_id: fence.id,
        sort_order: i,
        start_lat: start.lat,
        start_lng: start.lng,
        end_lat: end.lat,
        end_lng: end.lng,
        length_ft: normalizedSegmentLengths[i] ?? roundUpFeet(Number(seg.length_ft)),
      });
    }

    const gateList = Array.isArray(gates) ? gates : [];
    for (const g of gateList) {
      if (g.quantity > 0) {
        // We handle both grouped quantities or individual gates with lat/lng
        await supabase.from('gates').insert({
          fence_id: fence.id,
          gate_type: g.type === 'double' ? 'double' : 'single',
          quantity: g.quantity,
          lat: g.lat ?? null,
          lng: g.lng ?? null,
        });
      }
    }

    await supabase
      .from('quote_sessions')
      .update({
        status: 'drawing_saved',
        current_step: 'design',
        last_active_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({ ok: true, fenceId: fence.id });
  } catch (e) {
    console.error('drawing POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
