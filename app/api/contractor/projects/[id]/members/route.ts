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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const quoteSessionId = typeof body.quote_session_id === 'string' ? body.quote_session_id : '';
  if (!quoteSessionId) return NextResponse.json({ error: 'quote_session_id required' }, { status: 400 });

  const { data: project, error: pErr } = await supabase
    .from('contractor_projects')
    .select('id')
    .eq('id', projectId)
    .eq('contractor_id', contractorId)
    .single();
  if (pErr || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: session, error: sErr } = await supabase
    .from('quote_sessions')
    .select('id')
    .eq('id', quoteSessionId)
    .eq('contractor_id', contractorId)
    .single();
  if (sErr || !session) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  await supabase.from('contractor_project_members').delete().eq('quote_session_id', quoteSessionId);

  const { error: mErr } = await supabase.from('contractor_project_members').insert({
    project_id: projectId,
    quote_session_id: quoteSessionId,
  });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  await supabase.from('customers').update({ project_id: projectId }).eq('quote_session_id', quoteSessionId).eq('contractor_id', contractorId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quoteSessionId = searchParams.get('quote_session_id');
  if (!quoteSessionId) return NextResponse.json({ error: 'quote_session_id query required' }, { status: 400 });

  const { data: project } = await supabase
    .from('contractor_projects')
    .select('id')
    .eq('id', projectId)
    .eq('contractor_id', contractorId)
    .single();
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase
    .from('contractor_project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('quote_session_id', quoteSessionId);

  await supabase
    .from('customers')
    .update({ project_id: null })
    .eq('quote_session_id', quoteSessionId)
    .eq('contractor_id', contractorId);

  return NextResponse.json({ ok: true });
}
