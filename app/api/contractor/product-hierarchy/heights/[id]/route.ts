import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser, isContractorAdminRole } from '@/lib/contractor-auth-helpers';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isContractorAdminRole(cu.role))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  const contractorId = cu.contractorId;

  const { data: row } = await supabase.from('fence_heights').select('contractor_id').eq('id', id).single();
  if (!row || row.contractor_id !== contractorId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase.from('fence_heights').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
