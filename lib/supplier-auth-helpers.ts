import type { SupabaseClient } from '@supabase/supabase-js';

export async function getSupplierContractorSession(supabase: SupabaseClient): Promise<{
  contractorId: string;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  if (!ur?.contractor_id) return null;
  const { data: c } = await supabase.from('contractors').select('account_type').eq('id', ur.contractor_id).single();
  if (c?.account_type !== 'supplier') return null;
  return { contractorId: ur.contractor_id };
}
