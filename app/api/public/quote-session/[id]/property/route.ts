import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { formattedAddress, latitude, longitude, placeId, street_address, city, province_state, postal_zip, country } = body;

    if (!sessionId || !formattedAddress) {
      return NextResponse.json(
        { error: 'Missing session id or formattedAddress' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('properties').upsert(
      {
        quote_session_id: sessionId,
        formatted_address: formattedAddress,
        street_address: street_address || null,
        city: city || null,
        province_state: province_state || null,
        postal_zip: postal_zip || null,
        country: country || 'CA',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        place_id: placeId || null,
      },
      { onConflict: 'quote_session_id' }
    );

    if (error) {
      console.error('properties upsert error:', error);
      return NextResponse.json({ error: 'Failed to save property' }, { status: 500 });
    }

    await supabase
      .from('quote_sessions')
      .update({ status: 'address_saved', current_step: 'draw', last_active_at: new Date().toISOString() })
      .eq('id', sessionId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('property POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
