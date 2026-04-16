import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';

const ALLOWED_STATUS = new Set(['pending', 'quoted', 'closed']);

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
