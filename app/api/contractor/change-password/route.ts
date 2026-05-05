import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseJs } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { current_password?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const currentPassword = typeof body.current_password === 'string' ? body.current_password : '';
  const newPassword = typeof body.new_password === 'string' ? body.new_password : '';
  if (!currentPassword) {
    return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const anonClient = createSupabaseJs(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signError } = await anonClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  const admin = createSupabaseJs(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'Could not update password.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
