import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getMasterAdminId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ma } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  return ma?.id ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const supabase = await createClient();
  const masterId = await getMasterAdminId(supabase);
  if (!masterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: req, error: reqErr } = await supabase
    .from('material_quote_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqErr || !req) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sessionId = req.quote_session_id;
  let session = null;
  let customer = null;
  let property = null;
  let fence = null;
  let segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[] = [];
  let gates: { gate_type: string; quantity: number }[] = [];
  let layoutDrawing: { drawing_data: unknown; title: string } | null = null;

  const { data: layout } = await supabase
    .from('layout_drawings')
    .select('id, title, drawing_data')
    .eq('id', req.layout_drawing_id)
    .single();
  if (layout) layoutDrawing = { drawing_data: layout.drawing_data, title: layout.title };

  if (sessionId) {
    const [{ data: sess }, { data: cust }, { data: prop }, { data: fences }] = await Promise.all([
      supabase.from('quote_sessions').select('*').eq('id', sessionId).single(),
      supabase.from('customers').select('*').eq('quote_session_id', sessionId).single(),
      supabase.from('properties').select('*').eq('quote_session_id', sessionId).single(),
      supabase.from('fences').select('*').eq('quote_session_id', sessionId),
    ]);
    session = sess;
    customer = cust;
    property = prop;
    fence = fences?.[0] ?? null;
    if (fence) {
      const { data: segs } = await supabase
        .from('fence_segments')
        .select('start_lat, start_lng, end_lat, end_lng, length_ft')
        .eq('fence_id', fence.id)
        .order('sort_order');
      segments = segs || [];
      const { data: g } = await supabase.from('gates').select('gate_type, quantity').eq('fence_id', fence.id);
      gates = g || [];
    }
  }

  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, company_name, billing_access_override, billing_access_override_note')
    .eq('id', req.contractor_id)
    .single();

  return NextResponse.json({
    request: req,
    layoutDrawing,
    session,
    customer,
    property,
    fence,
    segments,
    gates,
    contractor: contractor ?? null,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const supabase = await createClient();
  const masterId = await getMasterAdminId(supabase);
  if (!masterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { status, master_response } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status != null) updates.status = status;
  if (master_response != null) updates.master_response = String(master_response).trim();

  const { error } = await supabase
    .from('material_quote_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
