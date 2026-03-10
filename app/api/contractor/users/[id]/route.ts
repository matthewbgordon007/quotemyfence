import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['owner', 'admin'];

async function getAuthUserAndRole(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, contractorId: null, role: null };
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id, role')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return { user, contractorId: ur?.contractor_id ?? null, role: ur?.role ?? null };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;
  const supabase = await createServerClient();
  const { user, contractorId, role } = await getAuthUserAndRole(supabase);
  if (!user || !contractorId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_ROLES.includes(role || ''))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const body = await request.json();
  const { role: newRole, is_active } = body;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, contractor_id, role')
    .eq('id', targetUserId)
    .single();

  if (!target || target.contractor_id !== contractorId)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (target.role === 'owner')
    return NextResponse.json({ error: 'Cannot change the owner' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof is_active === 'boolean') updates.is_active = is_active;
  if (newRole && ['admin', 'sales', 'estimator'].includes(newRole)) updates.role = newRole;

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
