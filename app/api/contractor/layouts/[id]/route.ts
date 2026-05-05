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

function totalFromDrawing(drawingData: unknown): number {
  const d = drawingData as { total_length_ft?: number } | null;
  const t = Number(d?.total_length_ft);
  return Number.isFinite(t) ? t : 0;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('layout_drawings')
    .select('*')
    .eq('id', id)
    .eq('contractor_id', contractorId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: layoutId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: layout, error: layoutErr } = await supabase
    .from('layout_drawings')
    .select('id, quote_session_id')
    .eq('id', layoutId)
    .eq('contractor_id', contractorId)
    .single();

  if (layoutErr || !layout) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title != null) updates.title = String(body.title).trim();
  if (body.drawing_data != null) updates.drawing_data = body.drawing_data;
  if (body.image_data_url !== undefined) {
    updates.image_data_url =
      body.image_data_url && typeof body.image_data_url === 'string'
        ? body.image_data_url.slice(0, 500000)
        : null;
  }

  const prevSessionId = (layout as { quote_session_id?: string | null }).quote_session_id ?? null;

  if (body.quote_session_id !== undefined) {
    const raw = body.quote_session_id;
    const nextSessionId = raw === null || raw === '' ? null : String(raw);

    if (nextSessionId) {
      const { data: session, error: sErr } = await supabase
        .from('quote_sessions')
        .select('id')
        .eq('id', nextSessionId)
        .eq('contractor_id', contractorId)
        .single();
      if (sErr || !session) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

      if (prevSessionId && prevSessionId !== nextSessionId) {
        await supabase.from('quote_sessions').update({ layout_drawing_id: null }).eq('id', prevSessionId).eq('layout_drawing_id', layoutId);
      }

      const { data: otherLayout } = await supabase
        .from('layout_drawings')
        .select('id')
        .eq('quote_session_id', nextSessionId)
        .neq('id', layoutId)
        .maybeSingle();
      if (otherLayout?.id) {
        await supabase.from('layout_drawings').update({ quote_session_id: null }).eq('id', otherLayout.id);
      }

      await supabase
        .from('quote_sessions')
        .update({
          layout_drawing_id: layoutId,
          status: 'drawing_saved',
          current_step: 'draw',
          last_active_at: new Date().toISOString(),
        })
        .eq('id', nextSessionId);

      updates.quote_session_id = nextSessionId;

      const totalLengthFt = body.drawing_data != null ? totalFromDrawing(body.drawing_data) : null;
      if (totalLengthFt != null && totalLengthFt >= 0) {
        const { data: fence } = await supabase.from('fences').select('id').eq('quote_session_id', nextSessionId).maybeSingle();
        if (fence?.id) {
          await supabase.from('fences').update({ total_length_ft: totalLengthFt }).eq('id', fence.id);
        } else {
          await supabase.from('fences').insert({
            quote_session_id: nextSessionId,
            label: 'Main',
            total_length_ft: totalLengthFt,
            has_removal: false,
          });
        }
      }
    } else {
      if (prevSessionId) {
        await supabase
          .from('quote_sessions')
          .update({ layout_drawing_id: null })
          .eq('id', prevSessionId)
          .eq('layout_drawing_id', layoutId);
      }
      updates.quote_session_id = null;
    }
  }

  const { data: updated, error: upErr } = await supabase
    .from('layout_drawings')
    .update(updates)
    .eq('id', layoutId)
    .eq('contractor_id', contractorId)
    .select()
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const sessionForFence = (updated as { quote_session_id?: string | null })?.quote_session_id ?? null;
  if (body.drawing_data != null && sessionForFence) {
    const tl = totalFromDrawing(body.drawing_data);
    const { data: fenceRow } = await supabase
      .from('fences')
      .select('id')
      .eq('quote_session_id', sessionForFence)
      .maybeSingle();
    if (fenceRow?.id) {
      await supabase.from('fences').update({ total_length_ft: tl }).eq('id', fenceRow.id);
    }
  }

  return NextResponse.json(updated);
}
