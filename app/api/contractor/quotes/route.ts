import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { quote_text, grand_total, calculator_state, homeowner_name, quote_address } = body;
  
  if (typeof quote_text !== 'string') {
    return NextResponse.json({ error: 'quote_text required' }, { status: 400 });
  }

  // 1. Create a new quote session (lead)
  const { data: session, error: sessionError } = await supabase
    .from('quote_sessions')
    .insert({
      contractor_id: contractorId,
      status: 'started',
      current_step: 'completed', // Manually created
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Failed to create quote session' }, { status: 500 });
  }

  const sessionId = session.id;

  // 2. Parse name
  const nameParts = (homeowner_name || 'Manual Quote').split(' ');
  const firstName = nameParts[0] || 'Manual';
  const lastName = nameParts.slice(1).join(' ') || 'Quote';

  // 3. Create customer record
  await supabase.from('customers').insert({
    quote_session_id: sessionId,
    contractor_id: contractorId,
    first_name: firstName,
    last_name: lastName,
    email: 'no-email@example.com', // Placeholder for manually created
  });

  // 4. Create property record
  if (quote_address) {
    await supabase.from('properties').insert({
      quote_session_id: sessionId,
      formatted_address: quote_address,
    });
  }

  // 5. Save the actual quote
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

  return NextResponse.json({ ok: true, quote_session_id: sessionId });
}