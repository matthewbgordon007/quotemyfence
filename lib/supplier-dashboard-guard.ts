import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Redirects unless the session user belongs to a supplier contractor account. */
export async function requireSupplierDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  if (!userRow?.contractor_id) redirect('/dashboard');

  const { data: contractor } = await supabase
    .from('contractors')
    .select('account_type')
    .eq('id', userRow.contractor_id)
    .maybeSingle();

  if (contractor?.account_type !== 'supplier') redirect('/dashboard');
}
