import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (existing) return NextResponse.json({ ok: true, already: true });

  const { error } = await supabase.from('master_admins').insert({
    auth_id: user.id,
    email: user.email ?? '',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
