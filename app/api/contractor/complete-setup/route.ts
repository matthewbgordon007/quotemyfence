import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { seedCatalogFromStandard } from '@/lib/seed-catalog-from-standard';
import {
  contractorConflictsErrorMessage,
  getContractorFieldConflicts,
  normalizeWebsite,
} from '@/lib/contractor-uniqueness';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * For users who are logged in but have no contractor (e.g. signup partially failed).
 * Creates contractor + user record so they can use the dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Your session could not be read. Try logging out, then log back in, and complete setup again.' },
        { status: 401 }
      );
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('contractor_id')
      .eq('auth_id', user.id)
      .single();

    if (existingUser?.contractor_id) {
      return NextResponse.json({
        error: 'You already have a contractor account',
        contractor_id: existingUser.contractor_id,
      }, { status: 400 });
    }

    const body = await request.json();
    const company_name = (body.company_name || '').trim();
    const rawSlug = (body.slug || '').trim();

    if (!company_name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const slug = (rawSlug || slugify(company_name))
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || slugify(company_name);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingContractor } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingContractor) {
      return NextResponse.json(
        { error: 'That URL slug is already taken. Try a different one.' },
        { status: 400 }
      );
    }

    const canonicalWebsite = normalizeWebsite(body.website);
    const conflicts = await getContractorFieldConflicts(supabaseAdmin, {
      email: user.email || '',
      companyName: company_name,
      phone: body.phone?.trim() || null,
      website: canonicalWebsite,
    });
    if (conflicts.length > 0) {
      return NextResponse.json({ error: contractorConflictsErrorMessage(conflicts) }, { status: 400 });
    }

    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .insert({
        company_name,
        slug,
        email: user.email!,
        phone: body.phone?.trim() || null,
        website: canonicalWebsite,
        address_line_1: body.address_line_1?.trim() || null,
        city: body.city?.trim() || null,
        province_state: body.province_state?.trim() || null,
        postal_zip: body.postal_zip?.trim() || null,
        country: 'CA',
        primary_color: body.primary_color || '#2563eb',
        secondary_color: body.primary_color || null,
        accent_color: body.primary_color || null,
        is_active: true,
      })
      .select('id')
      .single();

    if (contractorError || !contractor) {
      console.error('complete-setup contractor error:', contractorError);
      return NextResponse.json(
        { error: 'Failed to create company. Please try again.' },
        { status: 500 }
      );
    }

    const { error: userError } = await supabaseAdmin.from('users').insert({
      contractor_id: contractor.id,
      auth_id: user.id,
      first_name: (body.first_name || '').trim() || 'Owner',
      last_name: (body.last_name || '').trim() || '',
      email: user.email!,
      role: 'owner',
      is_active: true,
    });

    if (userError) {
      console.error('complete-setup user error:', userError);
      await supabaseAdmin.from('contractors').delete().eq('id', contractor.id);
      return NextResponse.json(
        { error: 'Failed to link account. Please try again.' },
        { status: 500 }
      );
    }

    const seedResult = await seedCatalogFromStandard(supabaseAdmin, contractor.id);
    if (!seedResult.ok) {
      console.warn('complete-setup: catalog seed failed', seedResult.error);
    }

    return NextResponse.json({ ok: true, contractor_id: contractor.id, slug });
  } catch (e) {
    console.error('complete-setup error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
