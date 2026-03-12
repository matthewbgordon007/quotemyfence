import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const secret = process.env.MASTER_ADMIN_INVITE_SECRET;
  if (!secret || secret.length < 8) {
    return NextResponse.json({ error: 'Admin registration is disabled. Contact the owner for an invite.' }, { status: 403 });
  }

  let body: { invite_code?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body is ok, invite_code will be missing
  }
  const inviteCode = (body.invite_code ?? '').trim();
  if (!inviteCode || inviteCode !== secret) {
    return NextResponse.json({ error: 'Invalid or missing invite code.' }, { status: 403 });
  }

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
