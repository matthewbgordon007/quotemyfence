import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return ur?.contractor_id ?? null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    first_name,
    last_name,
    email,
    phone,
    lead_source,
    formatted_address,
    street_address,
    city,
    province_state,
    postal_zip,
    country,
  } = body;

  const firstName = String(first_name ?? '').trim();
  const lastName = String(last_name ?? '').trim();
  const emailVal = String(email ?? '').trim();

  if (!firstName || !lastName || !emailVal) {
    return NextResponse.json(
      { error: 'First name, last name, and email are required' },
      { status: 400 }
    );
  }

  const address = String(formatted_address ?? '').trim() || '—';

  const { data: session, error: sessionError } = await supabase
    .from('quote_sessions')
    .insert({
      contractor_id: contractorId,
      status: 'started',
      current_step: 'contact',
      last_active_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const { error: customerError } = await supabase.from('customers').insert({
    quote_session_id: session.id,
    contractor_id: contractorId,
    first_name: firstName,
    last_name: lastName,
    email: emailVal,
    phone: phone ? String(phone).trim() || null : null,
    lead_source: lead_source ? String(lead_source).trim() || null : null,
  });
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });

  const { error: propertyError } = await supabase.from('properties').insert({
    quote_session_id: session.id,
    formatted_address: address,
    street_address: street_address ? String(street_address).trim() || null : null,
    city: city ? String(city).trim() || null : null,
    province_state: province_state ? String(province_state).trim() || null : null,
    postal_zip: postal_zip ? String(postal_zip).trim() || null : null,
    country: country ? String(country).trim() || null : null,
  });
  if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 500 });

  return NextResponse.json({ id: session.id });
}
