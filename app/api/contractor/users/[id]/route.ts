import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['owner', 'admin'];

async function getAuthUserAndRole(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, contractorId: null, role: null, usersId: null };
  const { data: ur } = await supabase
    .from('users')
    .select('id, contractor_id, role')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return {
    user,
    contractorId: ur?.contractor_id ?? null,
    role: ur?.role ?? null,
    usersId: ur?.id ?? null,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;
  const supabase = await createServerClient();
  const { user, contractorId, role, usersId } = await getAuthUserAndRole(supabase);
  if (!user || !contractorId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_ROLES.includes(role || ''))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const body = await request.json();
  const { role: newRole, is_active, transferOwnership } = body;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, contractor_id, role, is_active')
    .eq('id', targetUserId)
    .single();

  if (!target || target.contractor_id !== contractorId)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (transferOwnership === true) {
    if (role !== 'owner')
      return NextResponse.json({ error: 'Only the owner can transfer ownership' }, { status: 403 });
    if (!usersId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (targetUserId === usersId)
      return NextResponse.json({ error: 'You are already the owner' }, { status: 400 });
    if (target.role === 'owner')
      return NextResponse.json({ error: 'That user is already the owner' }, { status: 400 });
    if (!target.is_active)
      return NextResponse.json(
        { error: 'Activate this user before making them owner' },
        { status: 400 }
      );

    const prevRole = target.role;

    const { error: promoteError } = await supabaseAdmin
      .from('users')
      .update({ role: 'owner' })
      .eq('id', targetUserId)
      .eq('contractor_id', contractorId);

    if (promoteError)
      return NextResponse.json({ error: promoteError.message }, { status: 500 });

    const { error: demoteError } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('id', usersId)
      .eq('contractor_id', contractorId)
      .eq('role', 'owner');

    if (demoteError) {
      await supabaseAdmin
        .from('users')
        .update({ role: prevRole })
        .eq('id', targetUserId)
        .eq('contractor_id', contractorId);
      return NextResponse.json({ error: demoteError.message }, { status: 500 });
    }

    const { data: promoted } = await supabaseAdmin
      .from('users')
      .select()
      .eq('id', targetUserId)
      .single();

    return NextResponse.json({
      ok: true,
      user: promoted,
      message: 'Ownership transferred. You are now an admin.',
    });
  }

  if (target.role === 'owner')
    return NextResponse.json({ error: 'Cannot change the owner' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof is_active === 'boolean') updates.is_active = is_active;
  if (newRole && ['admin', 'sales'].includes(newRole)) updates.role = newRole;

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'No valid updates' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', targetUserId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;
  const supabase = await createServerClient();
  const { user, contractorId, role } = await getAuthUserAndRole(supabase);
  if (!user || !contractorId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_ROLES.includes(role || ''))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, contractor_id, role, auth_id')
    .eq('id', targetUserId)
    .single();

  if (!target || target.contractor_id !== contractorId)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.role === 'owner')
    return NextResponse.json({ error: 'Cannot delete the owner' }, { status: 400 });

  const { error: dbDeleteError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', targetUserId);
  if (dbDeleteError) {
    return NextResponse.json({ error: dbDeleteError.message }, { status: 500 });
  }

  if (target.auth_id) {
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(target.auth_id);
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
