import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id, role')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  if (!userRow?.contractor_id) {
    return NextResponse.json(
      { error: 'Contractor account not found' },
      { status: 403 }
    );
  }

  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', userRow.contractor_id)
    .single();

  if (contractorError || !contractor) {
    return NextResponse.json(
      { error: 'Contractor not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...contractor,
    user_role: userRow.role,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('contractor_id, role')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  if (!userRow?.contractor_id) {
    return NextResponse.json(
      { error: 'Contractor account not found' },
      { status: 403 }
    );
  }

  if (!['owner', 'admin'].includes(userRow.role || '')) {
    return NextResponse.json(
      { error: 'Admin or owner only' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const allowed = [
    'company_name',
    'slug',
    'phone',
    'website',
    'address_line_1',
    'city',
    'province_state',
    'postal_zip',
    'country',
    'logo_url',
    'primary_color',
    'secondary_color',
    'accent_color',
    'quote_notification_email',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }

  const { data: contractor, error } = await supabase
    .from('contractors')
    .update(updates)
    .eq('id', userRow.contractor_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(contractor);
}
