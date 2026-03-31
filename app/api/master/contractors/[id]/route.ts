import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const masterId = await getMasterAdminId(supabase);
  if (!masterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: contractor } = await supabaseAdmin
    .from('contractors')
    .select('id, company_name')
    .eq('id', id)
    .single();
  if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

  // Delete linked auth users first so no orphan auth identities remain.
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('auth_id')
    .eq('contractor_id', id);

  for (const u of users || []) {
    if (!u.auth_id) continue;
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(u.auth_id);
    if (authDeleteError) {
      return NextResponse.json(
        { error: `Failed deleting auth user: ${authDeleteError.message}` },
        { status: 500 }
      );
    }
  }

  // This removes contractor and all contractor-scoped rows via FK cascades.
  const { error: contractorDeleteError } = await supabaseAdmin
    .from('contractors')
    .delete()
    .eq('id', id);
  if (contractorDeleteError) {
    return NextResponse.json({ error: contractorDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted_company: contractor.company_name });
}

