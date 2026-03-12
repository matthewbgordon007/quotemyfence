import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ type: null });

  const { data: master } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (master) return NextResponse.json({ type: 'master' });

  const { data: contractorUser } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  if (contractorUser?.contractor_id) return NextResponse.json({ type: 'contractor' });

  return NextResponse.json({ type: null });
}
