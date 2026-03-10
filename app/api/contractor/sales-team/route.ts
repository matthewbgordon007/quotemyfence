import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getContractorIdAndRole(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { contractorId: null, role: null };
  const { data: ur } = await supabase.from('users').select('contractor_id, role').eq('auth_id', user.id).eq('is_active', true).single();
  return { contractorId: ur?.contractor_id ?? null, role: ur?.role ?? null };
}

export async function GET() {
  const supabase = await createClient();
  const { contractorId } = await getContractorIdAndRole(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('sales_team_members')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { contractorId, role } = await getContractorIdAndRole(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(role || '')) return NextResponse.json({ error: 'Admin or owner only' }, { status: 403 });

  const body = await request.json();
  const { name, title, phone, email, photo_url } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { data, error } = await supabase
    .from('sales_team_members')
    .insert({
      contractor_id: contractorId,
      name: name.trim(),
      title: title?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      photo_url: photo_url || null,
      display_order: 0,
      is_visible: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
