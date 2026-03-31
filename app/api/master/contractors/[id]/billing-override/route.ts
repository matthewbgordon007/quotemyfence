import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getMasterAdminId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ma } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  return ma?.id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const masterId = await getMasterAdminId(supabase);
  if (!masterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const enabled = !!body?.enabled;
  const note = typeof body?.note === 'string' ? body.note.trim() : '';

  const { error } = await supabase
    .from('contractors')
    .update({
      billing_access_override: enabled,
      billing_access_override_note: note || null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

