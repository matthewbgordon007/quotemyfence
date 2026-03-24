import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorIdAndRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { contractorId: null, role: null };
  const { data: ur } = await supabase.from('users').select('contractor_id, role').eq('auth_id', user.id).eq('is_active', true).single();
  return { contractorId: ur?.contractor_id ?? null, role: ur?.role ?? null };
}

async function assertOwnership(supabase: Awaited<ReturnType<typeof createClient>>, id: string, contractorId: string) {
  const { data } = await supabase.from('sales_team_members').select('contractor_id').eq('id', id).single();
  return data?.contractor_id === contractorId;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { contractorId, role } = await getContractorIdAndRole(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(role || '')) return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  if (!(await assertOwnership(supabase, id, contractorId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const allowed = ['name', 'title', 'phone', 'email', 'photo_url', 'display_order', 'is_visible', 'receives_leads'] as const;
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === 'name') updates[k] = String(body[k]).trim() || null;
      else if (k === 'title' || k === 'phone' || k === 'email' || k === 'photo_url') updates[k] = body[k] ? String(body[k]).trim() : null;
      else if (k === 'display_order') updates[k] = Number(body[k]) || 0;
      else if (k === 'is_visible' || k === 'receives_leads') updates[k] = !!body[k];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  if (updates.receives_leads === true) {
    const { error: clearOthersError } = await supabase
      .from('sales_team_members')
      .update({ receives_leads: false })
      .eq('contractor_id', contractorId)
      .neq('id', id);
    if (clearOthersError) {
      return NextResponse.json({ error: clearOthersError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from('sales_team_members')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const res = NextResponse.json(data);
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  return res;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { contractorId, role } = await getContractorIdAndRole(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(role || '')) return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  if (!(await assertOwnership(supabase, id, contractorId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase.from('sales_team_members').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
