import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

async function canEditColour(supabase: Awaited<ReturnType<typeof createClient>>, colourId: string, contractorId: string) {
  const { data: co } = await supabase.from('colour_options').select('fence_style_id').eq('id', colourId).single();
  if (!co) return false;
  const { data: fs } = await supabase.from('fence_styles').select('fence_type_id').eq('id', co.fence_style_id).single();
  if (!fs) return false;
  const { data: ft } = await supabase.from('fence_types').select('height_id, contractor_id').eq('id', fs.fence_type_id).single();
  if (!ft) return false;
  if (ft.contractor_id === contractorId) return true;
  if (ft.height_id) {
    const { data: h } = await supabase.from('fence_heights').select('contractor_id').eq('id', ft.height_id).single();
    return h?.contractor_id === contractorId;
  }
  return false;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.color_name !== undefined) updates.color_name = body.color_name;
  if (body.photo_url !== undefined) updates.photo_url = body.photo_url;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No updates' }, { status: 400 });

  const allowed = await canEditColour(supabase, id, contractorId);
  if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase.from('colour_options').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await canEditColour(supabase, id, contractorId);
  if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase.from('colour_pricing_rules').delete().eq('colour_option_id', id);
  const { error } = await supabase.from('colour_options').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
