import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser } from '@/lib/contractor-auth-helpers';
import { MATERIAL_QUOTE_REQUEST_SELECT } from '@/lib/supplier-material-quote-request-fields';
import { enrichMaterialQuoteRequests } from '@/lib/supplier-material-quote-requests-enrich';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error } = await supabase
    .from('material_quote_requests')
    .select(MATERIAL_QUOTE_REQUEST_SELECT)
    .eq('id', id)
    .eq('contractor_id', cu.contractorId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [request] = await enrichMaterialQuoteRequests(supabase, [row]);
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ request });
}
