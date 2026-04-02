import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      company_name,
      slug: rawSlug,
      phone,
      website,
      address_line_1,
      city,
      province_state,
      postal_zip,
      primary_color,
      first_name,
      last_name,
      logo_url,
    } = body;

    if (!company_name?.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const slug = (rawSlug?.trim() || slugify(company_name))
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || slugify(company_name);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingAuthUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (existingAuthUser) {
      return NextResponse.json(
        { error: 'This login already has a contractor account. Sign in to the dashboard instead of registering again.' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'That URL slug is already taken. Try a different one.' },
        { status: 400 }
      );
    }

    const canonicalWebsite = normalizeWebsite(website);
    const conflicts = await getContractorFieldConflicts(supabaseAdmin, {
      email: user.email || '',
      companyName: company_name.trim(),
      phone: phone?.trim() || null,
      website: canonicalWebsite,
    });
    if (conflicts.length > 0) {
      return NextResponse.json({ error: contractorConflictsErrorMessage(conflicts) }, { status: 400 });
    }

    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .insert({
        company_name: company_name.trim(),
        slug,
        email: user.email!,
        phone: phone?.trim() || null,
        website: canonicalWebsite,
        address_line_1: address_line_1?.trim() || null,
        city: city?.trim() || null,
        province_state: province_state?.trim() || null,
        postal_zip: postal_zip?.trim() || null,
        country: 'CA',
        logo_url: logo_url || null,
        primary_color: primary_color || '#2563eb',
        secondary_color: primary_color || null,
        accent_color: primary_color || null,
        is_active: true,
      })
      .select('id')
      .single();

    if (contractorError || !contractor) {
      console.error('contractor insert error:', contractorError);
      return NextResponse.json(
        { error: 'Failed to create company. Please try again.' },
        { status: 500 }
      );
    }

    const { error: userError } = await supabaseAdmin.from('users').insert({
      contractor_id: contractor.id,
      auth_id: user.id,
      first_name: (first_name || '').trim() || 'Owner',
      last_name: (last_name || '').trim() || '',
      email: user.email!,
      role: 'owner',
      is_active: true,
    });

    if (userError) {
      console.error('user insert error:', userError);
      await supabaseAdmin.from('contractors').delete().eq('id', contractor.id);
      return NextResponse.json(
        { error: 'Failed to link account. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      contractor_id: contractor.id,
      slug,
    });
  } catch (e) {
    console.error('signup error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
