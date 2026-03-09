import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PERIODS = ['day', 'week', 'month', 'year'] as const;
type Period = (typeof PERIODS)[number];

function getDateRange(period: Period): { from: string } {
  const now = new Date();
  const from = new Date(now);

  switch (period) {
    case 'day':
      from.setDate(from.getDate() - 1);
      break;
    case 'week':
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
      from.setMonth(from.getMonth() - 1);
      break;
    case 'year':
      from.setFullYear(from.getFullYear() - 1);
      break;
    default:
      from.setMonth(from.getMonth() - 1); // fallback to month
  }

  return { from: from.toISOString() };
}

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
  const period = (searchParams.get('period') ?? 'month') as Period;
  if (!PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period. Use: day, week, month, year' }, { status: 400 });
  }

  const { from } = getDateRange(period);

  const { data: sessions } = await supabase
    .from('quote_sessions')
    .select('id, lead_status')
    .eq('contractor_id', userRow.contractor_id)
    .gte('last_active_at', from);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const statusOrder = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
  const lead_status_breakdown: Record<string, number> = Object.fromEntries(statusOrder.map((s) => [s, 0]));
  for (const s of sessions ?? []) {
    const status = (s as { lead_status?: string }).lead_status ?? 'new';
    if (status in lead_status_breakdown) lead_status_breakdown[status]++;
  }
  let valueLow = 0;
  let valueHigh = 0;

  if (sessionIds.length > 0) {
    const { data: totals } = await supabase
      .from('quote_totals')
      .select('total_low, total_high')
      .in('quote_session_id', sessionIds);

    for (const t of totals ?? []) {
      valueLow += Number(t.total_low ?? 0);
      valueHigh += Number(t.total_high ?? 0);
    }
  }

  return NextResponse.json({
    period,
    lead_count: sessionIds.length,
    value_low: Math.round(valueLow * 100) / 100,
    value_high: Math.round(valueHigh * 100) / 100,
    lead_status_breakdown,
  });
}
