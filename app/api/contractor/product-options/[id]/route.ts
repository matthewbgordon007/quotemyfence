import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return ur?.contractor_id ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const allowed = ['height_ft', 'color', 'style_name', 'is_active'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates' }, { status: 400 });
  }

  const { data: opt } = await supabase
    .from('product_options')
    .select('id, product_id')
    .eq('id', id)
    .single();
  if (!opt) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', opt.product_id)
    .eq('contractor_id', contractorId)
    .single();
  if (!product) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('product_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: opt } = await supabase
    .from('product_options')
    .select('product_id')
    .eq('id', id)
    .single();
  if (!opt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', opt.product_id)
    .eq('contractor_id', contractorId)
    .single();
  if (!product) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('pricing_rules').delete().eq('product_option_id', id);
  const { error } = await supabase.from('product_options').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
