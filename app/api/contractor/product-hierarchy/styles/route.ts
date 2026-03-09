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
  const { fence_type_id, style_name } = body;
  if (!fence_type_id || !style_name?.trim()) return NextResponse.json({ error: 'fence_type_id and style_name required' }, { status: 400 });

  const { data: ft } = await supabase.from('fence_types').select('height_id, contractor_id').eq('id', fence_type_id).single();
  if (!ft) return NextResponse.json({ error: 'Fence type not found' }, { status: 404 });
  // Authorize: types with contractor_id (new flow) or via fence_heights (legacy)
  const ownsType = ft.contractor_id === contractorId;
  const ownsViaHeight = ft.height_id
    ? (await supabase.from('fence_heights').select('contractor_id').eq('id', ft.height_id).single()).data?.contractor_id === contractorId
    : false;
  if (!ownsType && !ownsViaHeight) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('fence_styles')
    .insert({ fence_type_id, style_name: style_name.trim(), is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
