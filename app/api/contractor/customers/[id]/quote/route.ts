import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { quote_text, grand_total, calculator_state } = body;
  if (typeof quote_text !== 'string') {
    return NextResponse.json({ error: 'quote_text required' }, { status: 400 });
  }

  const { data: session, error: fetchError } = await supabase
    .from('quote_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('contractor_id', contractorId)
    .single();

  if (fetchError || !session)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error: insertError } = await supabase
    .from('saved_quotes')
    .insert({
      quote_session_id: sessionId,
      quote_text,
      grand_total: Number(grand_total) || 0,
      calculator_state: calculator_state || null,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Also update last_active_at on the session just to keep it fresh
  await supabase.from('quote_sessions').update({ last_active_at: new Date().toISOString() }).eq('id', sessionId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const quoteId = new URL(request.url).searchParams.get('quote_id');
  if (!quoteId) return NextResponse.json({ error: 'Missing quote_id' }, { status: 400 });

  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabase
    .from('quote_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('contractor_id', contractorId)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase
    .from('saved_quotes')
    .delete()
    .eq('id', quoteId)
    .eq('quote_session_id', sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
