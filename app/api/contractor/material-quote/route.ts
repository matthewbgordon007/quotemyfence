import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const { layout_drawing_id, quote_session_id, description } = body;

  const layoutId = layout_drawing_id ?? body.layoutId;
  let sessionId = quote_session_id ?? body.quote_session_id;
  const desc = String(description ?? '').trim();

  if (!layoutId) return NextResponse.json({ error: 'Layout is required' }, { status: 400 });
  if (!desc) return NextResponse.json({ error: 'Description is required. Add specifics for your material quote.' }, { status: 400 });

  if (!sessionId) {
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

  const { data: req, error } = await supabase
    .from('material_quote_requests')
    .insert({
      layout_drawing_id: layout.id,
      quote_session_id: sessionId || null,
      contractor_id: contractorId,
      description: desc,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: req.id, ok: true });
}
