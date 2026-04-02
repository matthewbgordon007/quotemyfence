import type { SupabaseClient } from '@supabase/supabase-js';

/** Full dashboard access: company setup, billing, team, catalog edits. `owner` is legacy account owner; same powers as `admin`. */
export const CONTRACTOR_ADMIN_ROLES = ['owner', 'admin'] as const;

export type ContractorAdminRole = (typeof CONTRACTOR_ADMIN_ROLES)[number];

export function isContractorAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export async function getActiveContractorUser(supabase: SupabaseClient): Promise<{
  contractorId: string;
  role: string;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id, role')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  if (!ur?.contractor_id || ur.role == null) return null;
  return { contractorId: ur.contractor_id, role: ur.role };
}
