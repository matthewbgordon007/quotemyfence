import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: quoteId } = await params;
  const supabase = await createClient();

  // Validate the user has access via their contractor ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  if (!ur?.contractor_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch the quote, ensuring it belongs to a session owned by this contractor
  const { data: quote, error: quoteError } = await supabase
    .from('saved_quotes')
    .select('*, quote_sessions!inner(contractor_id)')
    .eq('id', quoteId)
    .eq('quote_sessions.contractor_id', ur.contractor_id)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ quote });
}