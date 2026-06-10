import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser } from '@/lib/contractor-auth-helpers';
import { MATERIAL_QUOTE_REQUEST_SELECT } from '@/lib/supplier-material-quote-request-fields';
import { enrichMaterialQuoteRequests } from '@/lib/supplier-material-quote-requests-enrich';

/** All material quote requests this contractor has sent (newest first). */
export async function GET() {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('material_quote_requests')
    .select(MATERIAL_QUOTE_REQUEST_SELECT)
    .eq('contractor_id', cu.contractorId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('contractor material-quote-requests list error:', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }

  const requests = await enrichMaterialQuoteRequests(supabase, rows || []);

  // Supplier company names so the list can show who each request went to.
  const supplierIds = Array.from(
    new Set((rows || []).map((r) => r.supplier_contractor_id).filter(Boolean))
  ) as string[];
  let supplierNameById: Record<string, string> = {};
  if (supplierIds.length > 0) {
    const { data: suppliers } = await supabase
      .from('contractors')
      .select('id, company_name')
      .in('id', supplierIds);
    supplierNameById = Object.fromEntries((suppliers || []).map((s) => [s.id, s.company_name]));
  }

  return NextResponse.json({
    requests: requests.map((r) => ({
      ...r,
      supplier_name: r.supplier_contractor_id ? supplierNameById[r.supplier_contractor_id] ?? null : null,
    })),
  });
}
