import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser, isContractorAdminRole } from '@/lib/contractor-auth-helpers';
import { createServiceRoleClient } from '@/lib/supabase-service-role';

async function resolveStandardHeightFt(
  admin: ReturnType<typeof createServiceRoleClient>,
  type: { height_id?: string | null; standard_height_ft?: number | null }
): Promise<number> {
  if (type.standard_height_ft != null && Number.isFinite(Number(type.standard_height_ft))) {
    return Math.min(20, Math.max(1, Number(type.standard_height_ft)));
  }
  if (type.height_id) {
    const { data: fh } = await admin.from('fence_heights').select('height_ft').eq('id', type.height_id).single();
    if (fh?.height_ft != null) return Math.min(20, Math.max(1, Number(fh.height_ft)));
  }
  return 6;
}

/** Copy a supplier fence style (and its colours) into this contractor's catalog. No pricing copied. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = await params;
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isContractorAdminRole(cu.role))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const { data: buyer } = await supabase.from('contractors').select('account_type').eq('id', cu.contractorId).single();
  if (buyer?.account_type === 'supplier')
    return NextResponse.json({ error: 'Not available for supplier accounts' }, { status: 403 });

  const { data: link } = await supabase
    .from('contractor_supplier_links')
    .select('id')
    .eq('contractor_id', cu.contractorId)
    .eq('supplier_contractor_id', supplierId)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: 'Link this supplier first' }, { status: 403 });

  const body = await request.json();
  const supplierFenceStyleId = String(body.supplier_fence_style_id || '').trim();
  if (!supplierFenceStyleId) return NextResponse.json({ error: 'supplier_fence_style_id required' }, { status: 400 });

  const admin = createServiceRoleClient();

  const { data: existingImport } = await admin
    .from('imported_supplier_styles')
    .select('buyer_fence_style_id')
    .eq('buyer_contractor_id', cu.contractorId)
    .eq('supplier_contractor_id', supplierId)
    .eq('supplier_fence_style_id', supplierFenceStyleId)
    .maybeSingle();
  if (existingImport?.buyer_fence_style_id) {
    return NextResponse.json(
      { error: 'This style is already imported', buyer_fence_style_id: existingImport.buyer_fence_style_id },
      { status: 409 }
    );
  }

  const { data: supplier, error: sErr } = await admin
    .from('contractors')
    .select('id, company_name, account_type')
    .eq('id', supplierId)
    .single();
  if (sErr || !supplier || supplier.account_type !== 'supplier')
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  const { data: style, error: stErr } = await admin.from('fence_styles').select('*').eq('id', supplierFenceStyleId).single();
  if (stErr || !style) return NextResponse.json({ error: 'Style not found' }, { status: 404 });

  const { data: fenceType, error: ftErr } = await admin
    .from('fence_types')
    .select('*')
    .eq('id', style.fence_type_id as string)
    .eq('contractor_id', supplierId)
    .single();
  if (ftErr || !fenceType) return NextResponse.json({ error: 'Product type not found for this style' }, { status: 404 });

  const standardHeight = await resolveStandardHeightFt(admin, fenceType as { height_id?: string | null; standard_height_ft?: number | null });
  const typeLabel = String(fenceType.name || 'Product').trim();
  const supplierLabel = String(supplier.company_name || 'Supplier').trim();
  const newTypeName = `${typeLabel} (${supplierLabel})`;

  const { data: maxOrd } = await admin
    .from('fence_types')
    .select('display_order')
    .eq('contractor_id', cu.contractorId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextDisplayOrder = (typeof maxOrd?.display_order === 'number' ? maxOrd.display_order : -1) + 1;

  const { data: newType, error: ntErr } = await admin
    .from('fence_types')
    .insert({
      contractor_id: cu.contractorId,
      name: newTypeName,
      standard_height_ft: standardHeight,
      display_order: nextDisplayOrder,
      is_active: true,
    })
    .select('id')
    .single();
  if (ntErr || !newType) return NextResponse.json({ error: ntErr?.message || 'Failed to create type' }, { status: 500 });

  const { data: newStyle, error: nsErr } = await admin
    .from('fence_styles')
    .insert({
      fence_type_id: newType.id,
      style_name: String(style.style_name || 'Style').trim(),
      photo_url: style.photo_url ?? null,
      display_order: typeof style.display_order === 'number' ? style.display_order : 0,
      is_hidden: Boolean(style.is_hidden),
      is_active: true,
    })
    .select('id')
    .single();
  if (nsErr || !newStyle) {
    await admin.from('fence_types').delete().eq('id', newType.id);
    return NextResponse.json({ error: nsErr?.message || 'Failed to create style' }, { status: 500 });
  }

  const { data: supplierColours } = await admin
    .from('colour_options')
    .select('*')
    .eq('fence_style_id', supplierFenceStyleId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  for (const col of supplierColours || []) {
    const { error: cErr } = await admin.from('colour_options').insert({
      fence_style_id: newStyle.id,
      color_name: String(col.color_name || 'Colour').trim(),
      photo_url: col.photo_url ?? null,
      display_order: typeof col.display_order === 'number' ? col.display_order : 0,
      is_active: true,
    });
    if (cErr) {
      await admin.from('fence_types').delete().eq('id', newType.id);
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }
  }

  const { error: impErr } = await admin.from('imported_supplier_styles').insert({
    buyer_contractor_id: cu.contractorId,
    supplier_contractor_id: supplierId,
    supplier_fence_style_id: supplierFenceStyleId,
    buyer_fence_style_id: newStyle.id,
  });
  if (impErr) {
    await admin.from('fence_types').delete().eq('id', newType.id);
    return NextResponse.json({ error: impErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fence_type_id: newType.id,
    fence_style_id: newStyle.id,
    message: 'Imported — set your pricing on the Products page.',
  });
}
