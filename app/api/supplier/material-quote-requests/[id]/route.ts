import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';
import { enrichMaterialQuoteRequests } from '@/lib/supplier-material-quote-requests-enrich';

const ALLOWED_STATUS = new Set(['pending', 'quoted', 'closed']);

const SELECT_FIELDS =
  'id, description, status, supplier_response, master_response, created_at, updated_at, contractor_id, quote_session_id, layout_drawing_id, attachment_url, attachment_name, attachment_content_type, attachment_size_bytes, supplier_seen_at';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error } = await supabase
    .from('material_quote_requests')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .eq('supplier_contractor_id', sess.contractorId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [request] = await enrichMaterialQuoteRequests(supabase, [row]);
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ request });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supplier_response =
    body.supplier_response !== undefined ? String(body.supplier_response).trim() || null : undefined;
  const status = body.status !== undefined ? String(body.status).trim() : undefined;

  if (status !== undefined && !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (supplier_response === undefined && status === undefined) {
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (supplier_response !== undefined) updates.supplier_response = supplier_response;
  if (status !== undefined) updates.status = status;

  const { data: row, error } = await supabase
    .from('material_quote_requests')
    .update(updates)
    .eq('id', id)
    .eq('supplier_contractor_id', sess.contractorId)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
