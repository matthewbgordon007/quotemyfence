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

export async function GET() {
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

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, email, role, is_active, created_at')
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ users: users ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { user, contractorId, role } = await getAuthUserAndRole(supabase);
  if (!user || !contractorId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_ROLES.includes(role || ''))
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const body = await request.json();
  const { email, first_name, last_name, role: newRole } = body;
  if (!email?.trim())
    return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const validRoles = ['admin', 'sales', 'estimator'];
  const roleToSet = validRoles.includes(newRole) ? newRole : 'sales';

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const emailTrim = String(email).trim().toLowerCase();

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('contractor_id', contractorId)
    .eq('email', emailTrim)
    .single();

  if (existingUser)
    return NextResponse.json({ error: 'A user with this email already exists for your company.' }, { status: 400 });

  const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailTrim, {
    data: { redirect_to: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://quotemyfence.com'}/login` },
  });

  if (inviteError) {
    if (inviteError.message?.toLowerCase().includes('already registered'))
      return NextResponse.json({ error: 'This email is already registered. They can log in and ask an admin to add them.' }, { status: 400 });
    return NextResponse.json({ error: inviteError.message || 'Failed to send invite' }, { status: 500 });
  }

  const authId = invited?.user?.id;
  if (!authId)
    return NextResponse.json({ error: 'Invite sent but could not link user. They may need to be added manually.' }, { status: 500 });

  const { error: insertError } = await supabaseAdmin.from('users').insert({
    contractor_id: contractorId,
    auth_id: authId,
    first_name: (first_name || '').trim() || 'User',
    last_name: (last_name || '').trim() || '',
    email: emailTrim,
    role: roleToSet,
    is_active: true,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'Failed to add user' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'Invite sent. They can set a password via the email link.' });
}
