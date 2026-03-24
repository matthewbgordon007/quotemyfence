import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  if (!userRow?.contractor_id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const needUnviewedCount = searchParams.get('unviewed_count') === '1';
  const leadFilter = searchParams.get('lead_filter'); // 'new' | 'contacted' | 'quoted' | 'won' | 'lost' | null (all)

  let query = supabase
    .from('quote_sessions')
    .select('id, status, current_step, started_at, last_active_at, completed_at, contractor_viewed_at, lead_status')
    .eq('contractor_id', userRow.contractor_id)
    .order('last_active_at', { ascending: false });

  const validStatuses = ['new', 'contacted', 'quoted', 'won', 'lost'];
  if (leadFilter && validStatuses.includes(leadFilter)) {
    query = query.eq('lead_status', leadFilter);
  }

  if (limit) {
    const n = Math.min(parseInt(limit, 10) || 50, 100);
    query = query.limit(n);
  }

  const [ { data: sessions }, { data: allStatuses } ] = await Promise.all([
    query,
    supabase
      .from('quote_sessions')
      .select('lead_status')
      .eq('contractor_id', userRow.contractor_id)
  ]);

  const counts: Record<string, number> = {
    new: 0, contacted: 0, quoted: 0, won: 0, lost: 0, all: 0
  };
  
  if (allStatuses) {
    counts.all = allStatuses.length;
    for (const s of allStatuses) {
      const st = s.lead_status || 'new';
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts.new++; // fallback
      }
    }
  }

  let unviewed_count = 0;
  if (needUnviewedCount) {
    const { count } = await supabase
      .from('quote_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('contractor_id', userRow.contractor_id)
      .is('contractor_viewed_at', null);
    unviewed_count = count ?? 0;
  }

  if (!sessions?.length) {
    return NextResponse.json({ customers: [], unviewed_count });
  }

  const sessionIds = sessions.map((s) => s.id);

  const { data: customers } = await supabase
    .from('customers')
    .select('quote_session_id, first_name, last_name, email, phone')
    .in('quote_session_id', sessionIds);

  const { data: properties } = await supabase
    .from('properties')
    .select('quote_session_id, formatted_address')
    .in('quote_session_id', sessionIds);

  const { data: fences } = await supabase
    .from('fences')
    .select('quote_session_id, total_length_ft, has_removal, subtotal_low, subtotal_high, total_low, total_high')
    .in('quote_session_id', sessionIds);

  const customerBySession = new Map((customers || []).map((c) => [c.quote_session_id, c]));
  const propertyBySession = new Map((properties || []).map((p) => [p.quote_session_id, p]));
  const fenceBySession = new Map((fences || []).map((f) => [f.quote_session_id, f]));

  const customersList = sessions.map((s) => {
    const customer = customerBySession.get(s.id);
    const property = propertyBySession.get(s.id);
    const fence = fenceBySession.get(s.id);
    return {
      id: s.id,
      status: s.status,
      current_step: s.current_step,
      started_at: s.started_at,
      last_active_at: s.last_active_at,
      completed_at: s.completed_at,
      contractor_viewed_at: (s as { contractor_viewed_at?: string | null }).contractor_viewed_at ?? null,
      lead_status: (s as { lead_status?: string }).lead_status ?? 'new',
      first_name: customer?.first_name ?? '—',
      last_name: customer?.last_name ?? '—',
      email: customer?.email ?? '',
      phone: customer?.phone ?? null,
      address: property?.formatted_address ?? null,
      total_length_ft: fence?.total_length_ft ?? null,
      has_removal: fence?.has_removal ?? null,
      subtotal_low: fence?.subtotal_low ?? null,
      subtotal_high: fence?.subtotal_high ?? null,
      total_low: fence?.total_low ?? null,
      total_high: fence?.total_high ?? null,
    };
  });

  return NextResponse.json({ customers: customersList, unviewed_count, counts });
}
