import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

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
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await assertOwnership(supabase, id, contractorId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const { standard_height_ft } = body;
  if (standard_height_ft === undefined) return NextResponse.json({ error: 'standard_height_ft required' }, { status: 400 });
  const val = Number(standard_height_ft);
  if (Number.isNaN(val) || val < 1 || val > 20) return NextResponse.json({ error: 'standard_height_ft must be between 1 and 20' }, { status: 400 });

  const { error } = await supabase.from('fence_types').update({ standard_height_ft: val }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await assertOwnership(supabase, id, contractorId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase.from('fence_types').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
