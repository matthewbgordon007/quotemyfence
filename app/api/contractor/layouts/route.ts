import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return ur?.contractor_id ?? null;
}

function totalFromDrawing(drawingData: unknown): number {
  const d = drawingData as { total_length_ft?: number } | null;
  const t = Number(d?.total_length_ft);
  return Number.isFinite(t) ? t : 0;
}

export async function GET() {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('layout_drawings')
    .select('id, title, created_at, updated_at, quote_session_id, drawing_data')
    .eq('contractor_id', contractorId)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  const sessionIds = Array.from(
    new Set(
      rows
        .map((r) => (r as { quote_session_id?: string | null }).quote_session_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let leadLabels = new Map<string, string>();
  if (sessionIds.length > 0) {
    const { data: custs } = await supabase
      .from('customers')
      .select('quote_session_id, first_name, last_name')
      .in('quote_session_id', sessionIds)
      .eq('contractor_id', contractorId);
    for (const c of custs || []) {
      const label = `${(c as { first_name?: string }).first_name || ''} ${(c as { last_name?: string }).last_name || ''}`.trim();
      leadLabels.set((c as { quote_session_id: string }).quote_session_id, label || 'Lead');
    }
  }

  const layouts = rows.map((r) => {
    const row = r as {
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
      quote_session_id?: string | null;
      drawing_data?: { total_length_ft?: number } | null;
    };
    const sid = row.quote_session_id ?? null;
    return {
      id: row.id,
      title: row.title,
      created_at: row.created_at,
      updated_at: row.updated_at,
      quote_session_id: sid,
      linked_lead_name: sid ? leadLabels.get(sid) ?? null : null,
      total_length_ft: totalFromDrawing(row.drawing_data),
    };
  });

  return NextResponse.json({ layouts });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, drawing_data, quote_session_id, image_data_url, standalone } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const drawingData = drawing_data ?? {};
  const totalLengthFt = totalFromDrawing(drawingData);
  const existingSessionId = quote_session_id ?? null;
  const wantStandalone = standalone === true || (!existingSessionId && body.create_placeholder_lead !== true);

  const { data: layout, error: layoutError } = await supabase
    .from('layout_drawings')
    .insert({
      contractor_id: contractorId,
      title: String(title).trim(),
      drawing_data: drawingData,
      image_data_url: image_data_url && typeof image_data_url === 'string' ? image_data_url.slice(0, 500000) : null,
      quote_session_id: existingSessionId ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (layoutError) return NextResponse.json({ error: layoutError.message }, { status: 500 });

  if (existingSessionId) {
    const { data: existingSession, error: fetchErr } = await supabase
      .from('quote_sessions')
      .select('id')
      .eq('id', existingSessionId)
      .eq('contractor_id', contractorId)
      .single();

    if (fetchErr || !existingSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    await supabase
      .from('quote_sessions')
      .update({
        layout_drawing_id: layout.id,
        status: 'drawing_saved',
        current_step: 'draw',
        last_active_at: new Date().toISOString(),
      })
      .eq('id', existingSessionId);

    await supabase.from('layout_drawings').update({ quote_session_id: existingSessionId }).eq('id', layout.id);

    const { data: existingFence } = await supabase
      .from('fences')
      .select('id')
      .eq('quote_session_id', existingSessionId)
      .limit(1)
      .maybeSingle();

    if (existingFence) {
      await supabase.from('fences').update({ total_length_ft: totalLengthFt }).eq('id', existingFence.id);
    } else {
      await supabase.from('fences').insert({
        quote_session_id: existingSessionId,
        label: 'Main',
        total_length_ft: totalLengthFt,
        has_removal: false,
      });
    }

    return NextResponse.json({ ...layout, lead_id: existingSessionId });
  }

  if (wantStandalone) {
    return NextResponse.json({ ...layout, lead_id: null });
  }

  const { data: session, error: sessionError } = await supabase
    .from('quote_sessions')
    .insert({
      contractor_id: contractorId,
      layout_drawing_id: layout.id,
      status: 'drawing_saved',
      current_step: 'draw',
      last_active_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const placeholderEmail = `layout-${layout.id}@pending.quotemyfence.local`;

  const { error: customerError } = await supabase.from('customers').insert({
    quote_session_id: session.id,
    contractor_id: contractorId,
    first_name: 'Layout',
    last_name: String(title).trim(),
    email: placeholderEmail,
    lead_source: 'Layout drawing',
  });
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });

  const { error: propertyError } = await supabase.from('properties').insert({
    quote_session_id: session.id,
    formatted_address: String(title).trim(),
  });
  if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 500 });

  const { error: fenceError } = await supabase.from('fences').insert({
    quote_session_id: session.id,
    label: 'Main',
    total_length_ft: totalLengthFt,
    has_removal: false,
  });
  if (fenceError) return NextResponse.json({ error: fenceError.message }, { status: 500 });

  await supabase.from('layout_drawings').update({ quote_session_id: session.id }).eq('id', layout.id);

  return NextResponse.json({ ...layout, quote_session_id: session.id, lead_id: session.id });
}
