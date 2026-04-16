import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';
import { MATERIAL_QUOTE_REQUEST_SELECT } from '@/lib/supplier-material-quote-request-fields';
import { enrichMaterialQuoteRequests } from '@/lib/supplier-material-quote-requests-enrich';

/** Layout + material quote requests assigned to this supplier. */
export async function GET() {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('material_quote_requests')
    .select(MATERIAL_QUOTE_REQUEST_SELECT)
    .eq('supplier_contractor_id', sess.contractorId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requests = await enrichMaterialQuoteRequests(supabase, rows || []);

  return NextResponse.json({
    requests,
  });
}
