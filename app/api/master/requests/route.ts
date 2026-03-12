import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getMasterAdminId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ma } = await supabase
    .from('master_admins')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  return ma?.id ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const masterId = await getMasterAdminId(supabase);
  if (!masterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: requests, error } = await supabase
    .from('material_quote_requests')
    .select(`
      id,
      layout_drawing_id,
      quote_session_id,
      contractor_id,
      description,
      status,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contractorIds = [...new Set((requests || []).map((r) => r.contractor_id))];
  const layoutIds = [...new Set((requests || []).map((r) => r.layout_drawing_id))];

  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, company_name')
    .in('id', contractorIds);

  const { data: layouts } = await supabase
    .from('layout_drawings')
    .select('id, title')
    .in('id', layoutIds);

  const sessionIds = (requests || []).map((r) => r.quote_session_id).filter(Boolean) as string[];
  const { data: customers } = sessionIds.length
    ? await supabase
        .from('customers')
        .select('quote_session_id, first_name, last_name')
        .in('quote_session_id', sessionIds)
    : { data: [] };
  const { data: properties } = sessionIds.length
    ? await supabase
        .from('properties')
        .select('quote_session_id, formatted_address')
        .in('quote_session_id', sessionIds)
    : { data: [] };

  const contractorBy = new Map((contractors || []).map((c) => [c.id, c]));
  const layoutBy = new Map((layouts || []).map((l) => [l.id, l]));
  const customerBy = new Map((customers || []).map((c) => [c.quote_session_id, c]));
  const propertyBy = new Map((properties || []).map((p) => [p.quote_session_id, p]));

  const list = (requests || []).map((r) => ({
    id: r.id,
    layout_drawing_id: r.layout_drawing_id,
    quote_session_id: r.quote_session_id,
    contractor_id: r.contractor_id,
    contractor_name: contractorBy.get(r.contractor_id)?.company_name ?? '—',
    layout_title: layoutBy.get(r.layout_drawing_id)?.title ?? '—',
    customer_name: r.quote_session_id
      ? `${customerBy.get(r.quote_session_id)?.first_name ?? ''} ${customerBy.get(r.quote_session_id)?.last_name ?? ''}`.trim() || '—'
      : '—',
    address: r.quote_session_id ? propertyBy.get(r.quote_session_id)?.formatted_address ?? '—' : '—',
    description: r.description,
    status: r.status,
    created_at: r.created_at,
  }));

  return NextResponse.json({ requests: list });
}
