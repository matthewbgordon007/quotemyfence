import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser } from '@/lib/contractor-auth-helpers';
import { buildMaterialQuoteCalculatorBootstrap } from '@/lib/material-quote-for-calculator';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await buildMaterialQuoteCalculatorBootstrap(supabase, id, cu.contractorId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
