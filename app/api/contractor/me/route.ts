import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  contractorConflictsErrorMessage,
  getContractorFieldConflicts,
  normalizeWebsite,
} from '@/lib/contractor-uniqueness';

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
    .select('id, contractor_id, role')
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
    user_id: userRow.id,
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
    .select('id, contractor_id, role')
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
    'quote_range_pct',
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (updates.slug !== undefined && typeof updates.slug === 'string') {
    const newSlug = updates.slug.trim().toLowerCase();
    if (newSlug) {
      const { data: slugTaken } = await admin
        .from('contractors')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', userRow.contractor_id)
        .maybeSingle();
      if (slugTaken) {
        return NextResponse.json(
          { error: 'That URL slug is already taken by another company. Choose a different one.' },
          { status: 400 }
        );
      }
      updates.slug = newSlug;
    }
  }

  const { data: currentContractor } = await admin
    .from('contractors')
    .select('company_name, phone, website, email')
    .eq('id', userRow.contractor_id)
    .single();

  if (!currentContractor) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
  }

  const nextCompany =
    updates.company_name !== undefined ? String(updates.company_name).trim() : currentContractor.company_name;

  const nextPhone =
    updates.phone !== undefined
      ? typeof updates.phone === 'string' && updates.phone.trim()
        ? updates.phone.trim()
        : null
      : currentContractor.phone;

  let websiteForConflict = normalizeWebsite(currentContractor.website);
  if (updates.website !== undefined) {
    const canonical =
      typeof updates.website === 'string' && updates.website.trim()
        ? normalizeWebsite(updates.website)
        : null;
    websiteForConflict = canonical;
    updates.website = canonical;
  }

  if (updates.company_name !== undefined || updates.phone !== undefined || body.website !== undefined) {
    const conflicts = await getContractorFieldConflicts(admin, {
      email: '',
      companyName: nextCompany,
      phone: nextPhone,
      website: websiteForConflict,
      excludeContractorId: userRow.contractor_id,
    });
    if (conflicts.length > 0) {
      return NextResponse.json({ error: contractorConflictsErrorMessage(conflicts) }, { status: 400 });
    }
  }

  if (updates.quote_range_pct !== undefined) {
    const n = Number(updates.quote_range_pct);
    updates.quote_range_pct = Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : 5;
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
