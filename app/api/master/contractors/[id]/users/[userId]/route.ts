import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getSessionMasterAdmin } from '@/lib/master-auth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: contractorId, userId: targetUserId } = await params;
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: target, error: tErr } = await admin
    .from('users')
    .select('id, contractor_id, role, auth_id')
    .eq('id', targetUserId)
    .single();

  if (tErr || !target || target.contractor_id !== contractorId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { count, error: countErr } = await admin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('contractor_id', contractorId);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  const n = count ?? 0;

  if (target.role === 'owner') {
    if (n <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the only user. Delete the whole company from the account page instead.' },
        { status: 400 }
      );
    }
    const { data: others } = await admin
      .from('users')
      .select('id, role, is_active, created_at')
      .eq('contractor_id', contractorId)
      .neq('id', targetUserId)
      .order('created_at', { ascending: true });

    const candidate =
      (others || []).find((u) => u.role === 'admin' && u.is_active) ||
      (others || []).find((u) => u.is_active) ||
      others?.[0];
    if (!candidate) {
      return NextResponse.json({ error: 'No eligible user to promote to owner.' }, { status: 400 });
    }

    const { error: promoteErr } = await admin.from('users').update({ role: 'owner' }).eq('id', candidate.id);
    if (promoteErr) return NextResponse.json({ error: promoteErr.message }, { status: 500 });
  }

  const { error: dbDeleteError } = await admin.from('users').delete().eq('id', targetUserId);
  if (dbDeleteError) return NextResponse.json({ error: dbDeleteError.message }, { status: 500 });

  if (target.auth_id) {
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(target.auth_id);
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
