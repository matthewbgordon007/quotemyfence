import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import {
  mapFenceSegmentsToLayoutDrawing,
  type MapFenceGate,
  type MapFenceSegment,
} from '@/lib/map-fence-to-layout-drawing';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  return ur?.contractor_id ?? null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const explicitLayoutFromBody =
    (body.layout_drawing_id != null && String(body.layout_drawing_id).trim() !== '') ||
    (body.layoutId != null && String(body.layoutId).trim() !== '');

  const {
    layout_drawing_id,
    quote_session_id,
    description,
    supplier_contractor_id: rawSupplier,
    attachment_url,
    attachment_name,
    attachment_content_type,
    attachment_size_bytes,
  } = body;
  const supplierContractorId =
    rawSupplier && String(rawSupplier).trim() && String(rawSupplier).trim() !== 'master'
      ? String(rawSupplier).trim()
      : null;

  let layoutId = layout_drawing_id ?? body.layoutId;
  let sessionId = quote_session_id ?? body.quote_session_id;
  const desc = String(description ?? '').trim();

  const descFinal = desc || 'No specifications provided.';

  if (sessionId && !layoutId) {
    const { data: sess } = await supabase
      .from('quote_sessions')
      .select('id, layout_drawing_id')
      .eq('id', sessionId)
      .eq('contractor_id', contractorId)
      .single();

    if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    layoutId = (sess as { layout_drawing_id?: string }).layout_drawing_id ?? null;

    if (!layoutId) {
      const { data: fences } = await supabase.from('fences').select('id, total_length_ft').eq('quote_session_id', sessionId);
      const fence = fences?.[0];
      if (!fence) return NextResponse.json({ error: 'No fence or layout for this customer. Draw a layout first.' }, { status: 400 });

      const { data: segs } = await supabase
        .from('fence_segments')
        .select('start_lat, start_lng, end_lat, end_lng, length_ft')
        .eq('fence_id', fence.id)
        .order('sort_order');
      const { data: gateRows } = await supabase
        .from('gates')
        .select('gate_type, quantity, lat, lng')
        .eq('fence_id', fence.id);
      const gates = (gateRows ?? []) as MapFenceGate[];
      const drawingData = mapFenceSegmentsToLayoutDrawing(
        (segs ?? []) as MapFenceSegment[],
        Number(fence.total_length_ft) || 0,
        gates
      );

      const { data: newLayout, error: layoutCreateErr } = await supabase
        .from('layout_drawings')
        .insert({
          contractor_id: contractorId,
          title: `Customer layout`,
          drawing_data: drawingData,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (layoutCreateErr || !newLayout) return NextResponse.json({ error: 'Failed to create layout' }, { status: 500 });
      layoutId = newLayout.id;
      await supabase.from('quote_sessions').update({ layout_drawing_id: layoutId }).eq('id', sessionId);
    }
  }

  if (!layoutId && !sessionId) return NextResponse.json({ error: 'Layout or session is required' }, { status: 400 });

  if (!sessionId && layoutId) {
    const { data: sess } = await supabase
      .from('quote_sessions')
      .select('id')
      .eq('layout_drawing_id', layoutId)
      .limit(1)
      .single();
    sessionId = sess?.id ?? null;
  }

  const { data: layout, error: layoutErr } = await supabase
    .from('layout_drawings')
    .select('id, contractor_id')
    .eq('id', layoutId)
    .eq('contractor_id', contractorId)
    .single();

  if (layoutErr || !layout) return NextResponse.json({ error: 'Layout not found' }, { status: 404 });

  /** Lead / calculator exports: overwrite linked layout sketch with the current Google Maps fence (lengths + gate pins). */
  if (sessionId && !explicitLayoutFromBody && layoutId) {
    const { data: fences } = await supabase
      .from('fences')
      .select('id, total_length_ft')
      .eq('quote_session_id', sessionId)
      .limit(1);
    const fence = fences?.[0] as { id: string; total_length_ft?: number | null } | undefined;
    if (fence?.id) {
      const [{ data: segs }, { data: gateRows }] = await Promise.all([
        supabase
          .from('fence_segments')
          .select('start_lat, start_lng, end_lat, end_lng, length_ft')
          .eq('fence_id', fence.id)
          .order('sort_order'),
        supabase.from('gates').select('gate_type, quantity, lat, lng').eq('fence_id', fence.id),
      ]);
      if (segs?.length) {
        const drawingData = mapFenceSegmentsToLayoutDrawing(
          segs as MapFenceSegment[],
          Number(fence.total_length_ft) || 0,
          (gateRows ?? []) as MapFenceGate[]
        );
        await supabase
          .from('layout_drawings')
          .update({ drawing_data: drawingData, updated_at: new Date().toISOString() })
          .eq('id', layoutId)
          .eq('contractor_id', contractorId);
      }
    }
  }

  if (supplierContractorId) {
    const { data: tgt } = await supabase
      .from('contractors')
      .select('account_type')
      .eq('id', supplierContractorId)
      .eq('is_active', true)
      .single();
    if (!tgt || tgt.account_type !== 'supplier') {
      return NextResponse.json({ error: 'Invalid supplier' }, { status: 400 });
    }
    const { data: rel } = await supabase
      .from('contractor_supplier_links')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('supplier_contractor_id', supplierContractorId)
      .maybeSingle();
    if (!rel) return NextResponse.json({ error: 'Link that supplier on the Suppliers page first' }, { status: 403 });
  }

  let jobSiteAddress = '';
  if (sessionId) {
    const { data: propRow } = await supabase
      .from('properties')
      .select('formatted_address')
      .eq('quote_session_id', sessionId)
      .maybeSingle();
    jobSiteAddress = String((propRow as { formatted_address?: string } | null)?.formatted_address || '').trim();
  }

  const descriptionForInsert =
    jobSiteAddress && !descFinal.includes(jobSiteAddress)
      ? `${descFinal}\n\n— Job site: ${jobSiteAddress}`
      : descFinal;

  const { data: req, error } = await supabase
    .from('material_quote_requests')
    .insert({
      layout_drawing_id: layout.id,
      quote_session_id: sessionId || null,
      contractor_id: contractorId,
      supplier_contractor_id: supplierContractorId,
      attachment_url: attachment_url ? String(attachment_url) : null,
      attachment_name: attachment_name ? String(attachment_name) : null,
      attachment_content_type: attachment_content_type ? String(attachment_content_type) : null,
      attachment_size_bytes:
        attachment_size_bytes != null && Number.isFinite(Number(attachment_size_bytes))
          ? Number(attachment_size_bytes)
          : null,
      description: descriptionForInsert,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (supplierContractorId && process.env.RESEND_API_KEY) {
    try {
      const [{ data: supplier }, { data: contractor }] = await Promise.all([
        supabase
          .from('contractors')
          .select('company_name, email, quote_notification_email')
          .eq('id', supplierContractorId)
          .single(),
        supabase.from('contractors').select('company_name').eq('id', contractorId).single(),
      ]);
      const toEmail =
        (supplier as { quote_notification_email?: string | null })?.quote_notification_email ||
        (supplier as { email?: string | null })?.email;
      if (toEmail) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.EMAIL_FROM || 'quotes@quotemyfence.com';
        const contractorName = contractor?.company_name || 'A contractor';
        await resend.emails.send({
          from,
          to: [toEmail],
          subject: jobSiteAddress
            ? `Material request — ${jobSiteAddress}`
            : `New material request from ${contractorName}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height:1.5;">
              <h2>New material request</h2>
              <p><strong>Contractor:</strong> ${contractorName}</p>
              <p><strong>Notes:</strong> ${descriptionForInsert.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              ${
                attachment_url
                  ? `<p><strong>Attachment:</strong> <a href="${String(attachment_url)}">${String(attachment_name || 'Open file')}</a></p>`
                  : ''
              }
              <p>Open Supplier workspace to respond.</p>
            </div>
          `,
        });
      }
    } catch {
      // Email is best-effort; request creation already succeeded.
    }
  }
  return NextResponse.json({ id: req.id, ok: true });
}
