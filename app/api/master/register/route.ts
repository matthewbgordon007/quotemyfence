import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count, error: countErr } = await admin
    .from('master_admins')
    .select('*', { count: 'exact', head: true });
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

  if ((count ?? 0) >= 1) {
    return NextResponse.json(
      {
        error:
          'Master admin registration is closed. Only the existing master account can access this area.',
      },
      { status: 403 }
    );
  }

  const gate = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  if (gate && user.email?.trim().toLowerCase() !== gate) {
    return NextResponse.json(
      { error: 'Master admin registration is restricted to a configured email address.' },
      { status: 403 }
    );
  }

  const { data: existing } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, already: true });

  const { error } = await supabase.from('master_admins').insert({
    auth_id: user.id,
    email: user.email ?? '',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
