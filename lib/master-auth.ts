import { createClient } from '@/lib/supabase/server';

export async function getSessionMasterAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: master } = await supabase
    .from('master_admins')
    .select('id, email')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!master) return null;
  return { user, masterId: master.id, email: master.email };
}
