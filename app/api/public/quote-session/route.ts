import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractorSlug, contact } = body;

    if (!contractorSlug || !contact?.firstName || !contact?.lastName || !contact?.email) {
      return NextResponse.json(
        { error: 'Missing contractorSlug or contact fields (firstName, lastName, email)' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .eq('slug', contractorSlug)
      .eq('is_active', true)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('quote_sessions')
      .insert({
        contractor_id: contractor.id,
        status: 'contact_saved',
        current_step: 'location',
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('quote_sessions insert error:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const { error: customerError } = await supabase.from('customers').insert({
      quote_session_id: session.id,
      contractor_id: contractor.id,
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone || null,
      lead_source: contact.leadSource || null,
    });

    if (customerError) {
      console.error('customers insert error:', customerError);
      return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (e) {
    console.error('quote-session POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
