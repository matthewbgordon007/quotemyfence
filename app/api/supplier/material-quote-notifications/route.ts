import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';

export async function GET() {
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { count, error } = await supabase
    .from('material_quote_requests')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_contractor_id', sess.contractorId)
    .is('supplier_seen_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unread_count: count ?? 0 });
}
