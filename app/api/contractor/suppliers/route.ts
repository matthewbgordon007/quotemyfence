import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser } from '@/lib/contractor-auth-helpers';

async function assertBuyerAccount(supabase: Awaited<ReturnType<typeof createClient>>, contractorId: string) {
  const { data: c } = await supabase.from('contractors').select('account_type').eq('id', contractorId).single();
  if (c?.account_type === 'supplier') {
    return NextResponse.json({ error: 'Supplier accounts use supplier tools instead.' }, { status: 403 });
  }
  return null;
}

/** Directory of platform suppliers + which ones this contractor has linked. */
export async function GET() {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const block = await assertBuyerAccount(supabase, cu.contractorId);
  if (block) return block;

  const [{ data: suppliers, error: sErr }, { data: links, error: lErr }] = await Promise.all([
    supabase
      .from('contractors')
      .select('id, company_name, logo_url, slug')
      .eq('account_type', 'supplier')
      .eq('is_active', true)
      .order('company_name', { ascending: true }),
    supabase
      .from('contractor_supplier_links')
      .select('supplier_contractor_id')
      .eq('contractor_id', cu.contractorId),
  ]);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  const linkedIds = Array.from(new Set((links || []).map((r) => r.supplier_contractor_id)));
  return NextResponse.json({
    suppliers: suppliers || [],
    linkedSupplierIds: linkedIds,
  });
}

/** Link this contractor to a supplier. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const block = await assertBuyerAccount(supabase, cu.contractorId);
  if (block) return block;

  const body = await request.json();
  const supplierId = String(body.supplier_contractor_id || '').trim();
  if (!supplierId) return NextResponse.json({ error: 'supplier_contractor_id required' }, { status: 400 });
  if (supplierId === cu.contractorId)
    return NextResponse.json({ error: 'Cannot link to your own company' }, { status: 400 });

  const { data: target, error: tErr } = await supabase
    .from('contractors')
    .select('id, account_type')
    .eq('id', supplierId)
    .eq('is_active', true)
    .single();
  if (tErr || !target) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  if (target.account_type !== 'supplier')
    return NextResponse.json({ error: 'That company is not a supplier account' }, { status: 400 });

  const { error } = await supabase.from('contractor_supplier_links').insert({
    contractor_id: cu.contractorId,
    supplier_contractor_id: supplierId,
  });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already linked' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Unlink a supplier. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const block = await assertBuyerAccount(supabase, cu.contractorId);
  if (block) return block;

  const supplierId = request.nextUrl.searchParams.get('supplier_contractor_id')?.trim();
  if (!supplierId) return NextResponse.json({ error: 'supplier_contractor_id query required' }, { status: 400 });

  const { error } = await supabase
    .from('contractor_supplier_links')
    .delete()
    .eq('contractor_id', cu.contractorId)
    .eq('supplier_contractor_id', supplierId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
