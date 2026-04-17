import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveContractorUser, isContractorAdminRole } from '@/lib/contractor-auth-helpers';

async function assertOwnership(supabase: Awaited<ReturnType<typeof createClient>>, typeId: string, contractorId: string) {
  const { data: ft } = await supabase.from('fence_types').select('contractor_id, height_id').eq('id', typeId).single();
  if (!ft) return false;
  if (ft.contractor_id === contractorId) return true;
  if (ft.height_id) {
    const { data: h } = await supabase.from('fence_heights').select('contractor_id').eq('id', ft.height_id).single();
    return !!(h && h.contractor_id === contractorId);
  }
  return false;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isContractorAdminRole(cu.role))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  const contractorId = cu.contractorId;
  if (!(await assertOwnership(supabase, id, contractorId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.standard_height_ft !== undefined) {
    const val = Number(body.standard_height_ft);
    if (Number.isNaN(val) || val < 1 || val > 20) {
      return NextResponse.json({ error: 'standard_height_ft must be between 1 and 20' }, { status: 400 });
    }
    updates.standard_height_ft = val;
  }

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    if (name.length > 200) return NextResponse.json({ error: 'Name is too long (max 200 characters)' }, { status: 400 });
    updates.name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Provide name and/or standard_height_ft' }, { status: 400 });
  }

  const { data, error } = await supabase.from('fence_types').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cu = await getActiveContractorUser(supabase);
  if (!cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isContractorAdminRole(cu.role))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  const contractorId = cu.contractorId;
  if (!(await assertOwnership(supabase, id, contractorId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase.from('fence_types').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
