import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getSessionMasterAdmin } from '@/lib/master-auth';

export async function GET() {
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('contractors')
    .select('*')
    .order('company_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Treat missing/null account_type as contractor (legacy DBs before account_type existed or was backfilled).
  const contractors = (data ?? []).filter((row: { account_type?: string | null }) => {
    const t = row.account_type;
    return t !== 'supplier';
  });

  return NextResponse.json({ contractors });
}

