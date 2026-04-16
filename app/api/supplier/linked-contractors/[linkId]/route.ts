import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';

/** Supplier removes a contractor link from their side. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase
    .from('contractor_supplier_links')
    .select('id')
    .eq('id', linkId)
    .eq('supplier_contractor_id', sess.contractorId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Link not found' }, { status: 404 });

  const { error } = await supabase.from('contractor_supplier_links').delete().eq('id', linkId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
