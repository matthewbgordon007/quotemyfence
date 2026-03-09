import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ contractors: [] });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const safe = q.replace(/[%"\\]/g, '').slice(0, 50);
  const pattern = `%${safe}%`;
  const { data: byName } = await supabase
    .from('contractors')
    .select('id, company_name, slug')
    .eq('is_active', true)
    .ilike('company_name', pattern)
    .limit(10);
  const { data: bySlug } = await supabase
    .from('contractors')
    .select('id, company_name, slug')
    .eq('is_active', true)
    .ilike('slug', pattern)
    .limit(10);

  const seen = new Set<string>();
  const contractors = [
    ...(byName || []),
    ...(bySlug || []),
  ].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).slice(0, 10).sort((a, b) => a.company_name.localeCompare(b.company_name));

  return NextResponse.json({ contractors });
}
