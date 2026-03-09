import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const { quote_text } = body;
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

  const { error: updateError } = await supabase
    .from('quote_sessions')
    .update({
      contractor_quote_text: quote_text,
      contractor_quote_saved_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
