import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['owner', 'admin'];

function getAppBaseUrl(requestUrl: string): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://quotemyfence.ca';
  return raw.replace(/\/+$/, '');
}

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;
  const supabase = await createServerClient();
  const { user, contractorId, role } = await getAuthUserAndRole(supabase);
  if (!user || !contractorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(role || '')) {
    return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, contractor_id, email')
    .eq('id', targetUserId)
    .single();

  if (!target || target.contractor_id !== contractorId || !target.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Resend onboarding by sending a password setup/reset email.
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${getAppBaseUrl(request.url)}/setup-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to resend invite' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: `Invite email sent to ${target.email}` });
}

