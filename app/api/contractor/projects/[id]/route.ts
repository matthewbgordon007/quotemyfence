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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: project, error } = await supabase
    .from('contractor_projects')
    .select('*')
    .eq('id', id)
    .eq('contractor_id', contractorId)
    .single();

  if (error || !project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: members } = await supabase
    .from('contractor_project_members')
    .select('quote_session_id')
    .eq('project_id', id);

  const sessionIds = (members || []).map((m) => (m as { quote_session_id: string }).quote_session_id);
  let homeowners: { quote_session_id: string; first_name: string; last_name: string; email: string }[] = [];
  if (sessionIds.length) {
    const { data: custs } = await supabase
      .from('customers')
      .select('quote_session_id, first_name, last_name, email')
      .in('quote_session_id', sessionIds)
      .eq('contractor_id', contractorId);
    homeowners = (custs || []) as typeof homeowners;
  }

  return NextResponse.json({ project, members: homeowners });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing, error: exErr } = await supabase
    .from('contractor_projects')
    .select('id')
    .eq('id', id)
    .eq('contractor_id', contractorId)
    .single();
  if (exErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name != null) updates.name = String(body.name).trim();
  if (body.notes !== undefined) updates.notes = body.notes === null ? null : String(body.notes);
  if (body.address !== undefined) updates.address = body.address === null ? null : String(body.address).trim() || null;
  if (body.fence_type_id !== undefined) updates.fence_type_id = body.fence_type_id || null;
  if (body.fence_style_id !== undefined) updates.fence_style_id = body.fence_style_id || null;
  if (body.colour_option_id !== undefined) updates.colour_option_id = body.colour_option_id || null;

  const { data, error } = await supabase
    .from('contractor_projects')
    .update(updates)
    .eq('id', id)
    .eq('contractor_id', contractorId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
