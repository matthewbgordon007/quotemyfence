import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';

/** Mark one material quote request as seen by the supplier (e.g. when opening the detail page). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from('material_quote_requests')
    .update({ supplier_seen_at: now, updated_at: now })
    .eq('id', id)
    .eq('supplier_contractor_id', sess.contractorId)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
