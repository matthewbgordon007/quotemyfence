import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const status = body?.lead_status;
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'Invalid lead_status. Must be one of: ' + VALID_STATUSES.join(', ') },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('quote_sessions')
    .update({ lead_status: status })
    .eq('id', sessionId)
    .eq('contractor_id', contractorId)
    .select('lead_status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ lead_status: data?.lead_status ?? status });
}
