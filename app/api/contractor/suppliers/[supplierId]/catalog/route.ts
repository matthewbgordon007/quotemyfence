import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser } from '@/lib/contractor-auth-helpers';
import { createServiceRoleClient } from '@/lib/supabase-service-role';

function byName<T>(get: (item: T) => string) {
  return (a: T, b: T) => get(a).localeCompare(get(b), undefined, { sensitivity: 'base', numeric: true });
}

/** Supplier product catalog for browsing/import — no pricing fields. */
export async function GET(_request: Request, { params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = await params;
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const admin = createServiceRoleClient();
  const { data: supplier } = await admin
    .from('contractors')
    .select('id, company_name, account_type')
    .eq('id', supplierId)
    .eq('is_active', true)
    .single();
  if (!supplier || supplier.account_type !== 'supplier')
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  const { data: types } = await admin
    .from('fence_types')
    .select('*')
    .eq('contractor_id', supplierId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const fenceTypes = types || [];
  if (fenceTypes.length === 0) {
    return NextResponse.json({
      supplier: { id: supplier.id, company_name: supplier.company_name },
      fenceTypes: [],
      fenceStyles: [],
      colourOptions: [],
    });
  }

  const typeIds = fenceTypes.map((t) => t.id);
  const { data: styles } = await admin
    .from('fence_styles')
    .select('*')
    .in('fence_type_id', typeIds)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  const fenceStyles = styles || [];
  const styleIds = fenceStyles.map((s) => s.id);

  const { data: colours } =
    styleIds.length > 0
      ? await admin
          .from('colour_options')
          .select('*')
          .in('fence_style_id', styleIds)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const colourOptions = colours || [];

  const { data: already } = await supabase
    .from('imported_supplier_styles')
    .select('supplier_fence_style_id')
    .eq('buyer_contractor_id', cu.contractorId)
    .eq('supplier_contractor_id', supplierId);

  const importedStyleIds = new Set((already || []).map((r) => r.supplier_fence_style_id));

  const sortedFenceTypes = [...fenceTypes].sort(byName((t) => (t as { name?: string }).name || ''));
  const sortedFenceStyles = [...fenceStyles].sort(byName((s) => (s as { style_name?: string }).style_name || ''));
  const sortedColourOptions = [...colourOptions].sort(byName((c) => (c as { color_name?: string }).color_name || ''));

  return NextResponse.json({
    supplier: { id: supplier.id, company_name: supplier.company_name },
    fenceTypes: sortedFenceTypes,
    fenceStyles: sortedFenceStyles.map((s) => ({
      ...s,
      already_imported: importedStyleIds.has((s as { id: string }).id),
    })),
    colourOptions: sortedColourOptions,
  });
}
