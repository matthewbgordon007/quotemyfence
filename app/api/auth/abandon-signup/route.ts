import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Removes the current Auth user when they have no `users` row yet (e.g. signUp succeeded
 * but /api/auth/signup failed). Lets the same email register again after a retry.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: linked } = await admin.from('users').select('id').eq('auth_id', user.id).maybeSingle();
  if (linked) {
    return NextResponse.json(
      { error: 'This login is already linked to a company. Sign in or contact support.' },
      { status: 400 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
