import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getSessionMasterAdmin } from '@/lib/master-auth';

type DemoSessionRow = {
  id: string;
  contractor_id: string | null;
  status: string | null;
  current_step: string | null;
  is_demo?: boolean | null;
  started_at: string | null;
  last_active_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  customers?:
    | { first_name: string | null; last_name: string | null; email: string | null; phone: string | null; lead_source: string | null }
    | { first_name: string | null; last_name: string | null; email: string | null; phone: string | null; lead_source: string | null }[]
    | null;
  properties?: { formatted_address: string | null } | { formatted_address: string | null }[] | null;
};

const SELECT =
  '*, customers(first_name,last_name,email,phone,lead_source), properties(formatted_address)';

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET() {
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Only quotes that were started from the public homepage demo (?demo=1),
  // which sets quote_sessions.is_demo = true. Not every quote on the demo
  // catalog account.
  const flagged = await supabaseAdmin
    .from('quote_sessions')
    .select(SELECT)
    .eq('is_demo', true)
    .order('last_active_at', { ascending: false });

  if (flagged.error) {
    // is_demo column not present yet (migration not run).
    if (/is_demo/.test(flagged.error.message || '')) {
      return NextResponse.json({ demos: [], migrationNeeded: true });
    }
    return NextResponse.json({ error: flagged.error.message }, { status: 500 });
  }

  const byId = new Map<string, DemoSessionRow>();
  for (const row of (flagged.data ?? []) as DemoSessionRow[]) byId.set(row.id, row);

  const demos = Array.from(byId.values())
    .map((row) => {
      const customer = first(row.customers);
      const property = first(row.properties);
      return {
        id: row.id,
        status: row.status,
        currentStep: row.current_step,
        isFlagged: row.is_demo === true,
        startedAt: row.started_at,
        lastActiveAt: row.last_active_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        firstName: customer?.first_name ?? null,
        lastName: customer?.last_name ?? null,
        email: customer?.email ?? null,
        phone: customer?.phone ?? null,
        leadSource: customer?.lead_source ?? null,
        address: property?.formatted_address ?? null,
      };
    })
    .sort((a, b) => {
      const ta = a.lastActiveAt ? Date.parse(a.lastActiveAt) : 0;
      const tb = b.lastActiveAt ? Date.parse(b.lastActiveAt) : 0;
      return tb - ta;
    });

  return NextResponse.json({ demos });
}
