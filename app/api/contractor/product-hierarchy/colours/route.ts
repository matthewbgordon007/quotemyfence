import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    fence_style_id,
    color_name,
    photo_url,
    base_price_per_ft,
    single_gate,
    double_gate,
    removal_price_per_ft,
    minimum_job,
  } = body;
  if (!fence_style_id || !color_name?.trim()) return NextResponse.json({ error: 'fence_style_id and color_name required' }, { status: 400 });

  const { data: fs } = await supabase.from('fence_styles').select('fence_type_id').eq('id', fence_style_id).single();
  if (!fs) return NextResponse.json({ error: 'Style not found' }, { status: 404 });
  const { data: ft } = await supabase.from('fence_types').select('contractor_id, height_id').eq('id', fs.fence_type_id).single();
  if (!ft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const isOwner = ft.contractor_id === contractorId || (ft.height_id && ((await supabase.from('fence_heights').select('contractor_id').eq('id', ft.height_id).single()).data?.contractor_id === contractorId));
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: colour, error: colourErr } = await supabase
    .from('colour_options')
    .insert({ fence_style_id, color_name: color_name.trim(), photo_url: photo_url || null, is_active: true })
    .select()
    .single();

  if (colourErr) return NextResponse.json({ error: colourErr.message }, { status: 500 });

  // Pricing is set at style level, not per colour. No colour_pricing_rule created.
  return NextResponse.json(colour);
}
