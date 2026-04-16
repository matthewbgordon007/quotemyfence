import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';

/** Layout + material quote requests assigned to this supplier. */
export async function GET() {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('material_quote_requests')
    .select(
      'id, description, status, supplier_response, master_response, created_at, updated_at, contractor_id, quote_session_id, layout_drawing_id, attachment_url, attachment_name, attachment_content_type, attachment_size_bytes, supplier_seen_at'
    )
    .eq('supplier_contractor_id', sess.contractorId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contractorIds = Array.from(new Set((rows || []).map((r) => r.contractor_id)));
  let companyById = new Map<string, { company_name: string; slug: string | null }>();
  if (contractorIds.length > 0) {
    const { data: cos } = await supabase
      .from('contractors')
      .select('id, company_name, slug')
      .in('id', contractorIds);
    companyById = new Map((cos || []).map((c) => [c.id, c]));
  }

  return NextResponse.json({
    requests: (rows || []).map((r) => ({
      ...r,
      contractor: companyById.get(r.contractor_id) || { company_name: 'Contractor', slug: null },
    })),
  });
}
