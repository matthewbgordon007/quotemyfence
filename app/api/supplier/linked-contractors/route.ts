import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';

/** Contractors who have linked this supplier. */
export async function GET() {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: links, error } = await supabase
    .from('contractor_supplier_links')
    .select('id, contractor_id, created_at')
    .eq('supplier_contractor_id', sess.contractorId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contractorIds = Array.from(new Set((links || []).map((l) => l.contractor_id)));
  if (contractorIds.length === 0) return NextResponse.json({ contractors: [] });

  const { data: companies, error: cErr } = await supabase
    .from('contractors')
    .select('id, company_name, slug, logo_url')
    .in('id', contractorIds);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const byId = new Map((companies || []).map((c) => [c.id, c]));
  return NextResponse.json({
    contractors: (links || []).map((l) => ({
      link_id: l.id,
      linked_at: l.created_at,
      contractor: byId.get(l.contractor_id) || { id: l.contractor_id, company_name: 'Unknown' },
    })),
  });
}
