import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorIdAndRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { contractorId: null, role: null };
  const { data: ur } = await supabase.from('users').select('contractor_id, role').eq('auth_id', user.id).eq('is_active', true).single();
  return { contractorId: ur?.contractor_id ?? null, role: ur?.role ?? null };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { contractorId, role } = await getContractorIdAndRole(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(role || '')) return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const body = await request.json();
  const allowed = [
    'name',
    'category',
    'material',
    'style',
    'default_height_ft',
    'description',
    'thumbnail_url',
    'preview_image_url',
    'is_active',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('contractor_id', contractorId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { contractorId, role } = await getContractorIdAndRole(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(role || '')) return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('contractor_id', contractorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
