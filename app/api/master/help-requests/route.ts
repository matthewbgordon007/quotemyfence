import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getSessionMasterAdmin } from '@/lib/master-auth';

type HelpRequestRow = {
  id: string;
  quote_session_id: string | null;
  contractor_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string;
  page_url: string | null;
  status: string;
  created_at: string | null;
  contractors?:
    | { company_name: string | null; slug: string | null }
    | { company_name: string | null; slug: string | null }[]
    | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = adminClient();
  const { data, error } = await supabaseAdmin
    .from('help_requests')
    .select('*, contractors(company_name, slug)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    if (/help_requests/.test(error.message || '')) {
      return NextResponse.json({ requests: [], migrationNeeded: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = ((data ?? []) as HelpRequestRow[]).map((row) => {
    const contractor = first(row.contractors);
    return {
      id: row.id,
      quoteSessionId: row.quote_session_id,
      contractorId: row.contractor_id,
      contractorName: contractor?.company_name ?? null,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      pageUrl: row.page_url,
      status: row.status,
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ requests });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const status = body.status === 'resolved' || body.status === 'open' ? body.status : null;
  if (!id || !status) {
    return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 });
  }

  const supabaseAdmin = adminClient();
  const { error } = await supabaseAdmin.from('help_requests').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
