import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getSessionMasterAdmin } from '@/lib/master-auth';
import {
  contractorConflictsErrorMessage,
  getContractorFieldConflicts,
  normalizeWebsite,
} from '@/lib/contractor-uniqueness';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: contractor, error: cErr } = await admin.from('contractors').select('*').eq('id', id).single();
  if (cErr || !contractor) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const { data: users, error: uErr } = await admin
    .from('users')
    .select('id, first_name, last_name, email, role, is_active, auth_id, created_at')
    .eq('contractor_id', id)
    .order('created_at', { ascending: true });

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ contractor, users: users ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: current, error: curErr } = await admin.from('contractors').select('*').eq('id', id).single();
  if (curErr || !current) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const body = await request.json();
  const allowed = [
    'company_name',
    'slug',
    'email',
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
    'billing_access_override',
    'billing_access_override_note',
    'is_active',
  ] as const;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }

  if (updates.email !== undefined) {
    const raw = String(updates.email).trim().toLowerCase();
    if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    updates.email = raw;
  }

  if (updates.slug !== undefined && typeof updates.slug === 'string') {
    const newSlug = updates.slug.trim().toLowerCase();
    if (newSlug) {
      const { data: slugTaken } = await admin
        .from('contractors')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', id)
        .maybeSingle();
      if (slugTaken) {
        return NextResponse.json(
          { error: 'That URL slug is already taken by another company.' },
          { status: 400 }
        );
      }
      updates.slug = newSlug;
    }
  }

  const nextCompany =
    updates.company_name !== undefined ? String(updates.company_name).trim() : current.company_name;

  const nextPhone =
    updates.phone !== undefined
      ? typeof updates.phone === 'string' && updates.phone.trim()
        ? updates.phone.trim()
        : null
      : current.phone;

  let websiteForConflict = normalizeWebsite(current.website as string | null);
  if (updates.website !== undefined) {
    const canonical =
      typeof updates.website === 'string' && updates.website.trim()
        ? normalizeWebsite(updates.website)
        : null;
    websiteForConflict = canonical;
    updates.website = canonical;
  }

  const oldCompanyEmail = String(current.email || '').trim().toLowerCase();
  const nextEmailForConflict =
    updates.email !== undefined && typeof updates.email === 'string'
      ? updates.email.trim().toLowerCase()
      : oldCompanyEmail;

  if (
    updates.company_name !== undefined ||
    updates.phone !== undefined ||
    body.website !== undefined ||
    updates.email !== undefined
  ) {
    const conflicts = await getContractorFieldConflicts(admin, {
      email: nextEmailForConflict,
      companyName: nextCompany,
      phone: nextPhone,
      website: websiteForConflict,
      excludeContractorId: id,
    });
    if (conflicts.length > 0) {
      return NextResponse.json({ error: contractorConflictsErrorMessage(conflicts) }, { status: 400 });
    }
  }

  if (updates.quote_range_pct !== undefined) {
    const n = Number(updates.quote_range_pct);
    updates.quote_range_pct = Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : 5;
  }

  if (updates.billing_access_override !== undefined) {
    updates.billing_access_override = Boolean(updates.billing_access_override);
  }
  if (updates.billing_access_override_note !== undefined) {
    updates.billing_access_override_note =
      typeof updates.billing_access_override_note === 'string'
        ? updates.billing_access_override_note.trim() || null
        : null;
  }
  if (updates.is_active !== undefined) {
    updates.is_active = Boolean(updates.is_active);
  }

  const newEmail =
    updates.email !== undefined && typeof updates.email === 'string'
      ? updates.email.trim().toLowerCase()
      : oldCompanyEmail;
  const emailChanged = updates.email !== undefined && newEmail !== oldCompanyEmail;

  const { data: contractor, error } = await admin
    .from('contractors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (emailChanged) {
    const { data: team } = await admin.from('users').select('id, email, auth_id').eq('contractor_id', id);
    for (const row of team || []) {
      if (!row.auth_id) continue;
      const rowEmail = String(row.email || '').trim().toLowerCase();
      if (rowEmail !== oldCompanyEmail) continue;
      const { error: authErr } = await admin.auth.admin.updateUserById(row.auth_id, { email: newEmail });
      if (authErr) {
        await admin
          .from('contractors')
          .update({ email: oldCompanyEmail, updated_at: new Date().toISOString() })
          .eq('id', id);
        return NextResponse.json(
          { error: authErr.message || 'Could not update login email for a team member. Company email reverted.' },
          { status: 400 }
        );
      }
      const { error: userRowErr } = await admin.from('users').update({ email: newEmail }).eq('id', row.id);
      if (userRowErr) {
        await admin.auth.admin.updateUserById(row.auth_id, { email: oldCompanyEmail });
        await admin
          .from('contractors')
          .update({ email: oldCompanyEmail, updated_at: new Date().toISOString() })
          .eq('id', id);
        return NextResponse.json({ error: userRowErr.message }, { status: 400 });
      }
    }
  }

  return NextResponse.json(contractor);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionMasterAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: contractor } = await supabaseAdmin
    .from('contractors')
    .select('id, company_name')
    .eq('id', id)
    .single();
  if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });

  const { data: users } = await supabaseAdmin.from('users').select('auth_id').eq('contractor_id', id);

  for (const u of users || []) {
    if (!u.auth_id) continue;
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(u.auth_id);
    if (authDeleteError) {
      return NextResponse.json(
        { error: `Failed deleting auth user: ${authDeleteError.message}` },
        { status: 500 }
      );
    }
  }

  const { error: contractorDeleteError } = await supabaseAdmin.from('contractors').delete().eq('id', id);
  if (contractorDeleteError) {
    return NextResponse.json({ error: contractorDeleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted_company: contractor.company_name });
}
