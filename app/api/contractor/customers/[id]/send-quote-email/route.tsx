import React from 'react';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { Resend } from 'resend';
import { QuotePdfDocument } from '@/lib/quote-pdf-document';

async function getContractorId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase.from('users').select('contractor_id').eq('auth_id', user.id).eq('is_active', true).single();
  return ur?.contractor_id ?? null;
}

function buildStaticMapUrl(
  segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number }[],
  apiKey: string
): string {
  if (segments.length === 0) return '';
  const points: string[] = [];
  segments.forEach((seg, i) => {
    if (i === 0) points.push(`${seg.start_lat},${seg.start_lng}`);
    points.push(`${seg.end_lat},${seg.end_lng}`);
  });
  const path = `color:0xeab308|weight:6|${points.join('|')}`;
  return `https://maps.googleapis.com/maps/api/staticmap?size=600x350&scale=2&maptype=satellite&path=${encodeURIComponent(path)}&key=${apiKey}`;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const contractorId = await getContractorId(supabase);
  if (!contractorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 500 });

  const { data: session, error: sessionError } = await supabase
    .from('quote_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('contractor_id', contractorId)
    .single();

  if (sessionError || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const quoteText = (session as { contractor_quote_text?: string | null }).contractor_quote_text;
  if (!quoteText) return NextResponse.json({ error: 'No saved quote' }, { status: 400 });

  const [
    { data: customer },
    { data: property },
    { data: contractor },
    { data: fences },
    { data: leadRecipient },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('quote_session_id', sessionId).single(),
    supabase.from('properties').select('*').eq('quote_session_id', sessionId).single(),
    supabase.from('contractors').select('company_name, phone, website, email, quote_notification_email').eq('id', contractorId).single(),
    supabase.from('fences').select('*').eq('quote_session_id', sessionId),
    supabase.from('sales_team_members').select('email').eq('contractor_id', contractorId).eq('receives_leads', true).limit(1).maybeSingle(),
  ]);

  if (!customer?.email) return NextResponse.json({ error: 'Customer has no email' }, { status: 400 });

  const fence = fences?.[0] ?? null;
  let segments: { start_lat: number; start_lng: number; end_lat: number; end_lng: number; length_ft?: number }[] = [];
  let gates: { gate_type: string; quantity: number }[] = [];
  let designSummary: string | null = null;

  if (fence) {
    const { data: segs } = await supabase
      .from('fence_segments')
      .select('start_lat, start_lng, end_lat, end_lng, length_ft')
      .eq('fence_id', fence.id)
      .order('sort_order');
    segments = segs || [];
    const { data: gateRows } = await supabase.from('gates').select('gate_type, quantity').eq('fence_id', fence.id);
    gates = gateRows || [];

    if (fence.selected_colour_option_id) {
      const { data: colour } = await supabase.from('colour_options').select('color_name, fence_style_id').eq('id', fence.selected_colour_option_id).single();
      if (colour) {
        const { data: style } = await supabase.from('fence_styles').select('style_name, fence_type_id').eq('id', colour.fence_style_id).single();
        if (style) {
          const { data: ft } = await supabase.from('fence_types').select('name, standard_height_ft').eq('id', style.fence_type_id).single();
          if (ft) {
            designSummary = [
              ft.standard_height_ft != null && `${ft.standard_height_ft} ft`,
              ft.name,
              style.style_name,
              colour.color_name,
            ].filter(Boolean).join(' • ');
          }
        }
      }
    } else if (fence.selected_product_option_id) {
      const { data: opt } = await supabase.from('product_options').select('height_ft, color, style_name, product_id').eq('id', fence.selected_product_option_id).single();
      if (opt) {
        const { data: prod } = await supabase.from('products').select('name').eq('id', opt.product_id).single();
        designSummary = [opt.height_ft && `${opt.height_ft} ft`, prod?.name, opt.style_name, opt.color].filter(Boolean).join(' • ');
      }
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapImageUrl = apiKey && segments.length >= 2 ? buildStaticMapUrl(segments, apiKey) : null;

  const pdfData = {
    contractor: contractor ?? { company_name: 'Your Contractor', phone: null, website: null },
    customer: customer ?? { first_name: '', last_name: '', email: '', phone: null },
    property: property ?? { formatted_address: '', city: null, province_state: null, postal_zip: null },
    fence: fence ? { total_length_ft: fence.total_length_ft, has_removal: fence.has_removal } : null,
    segments,
    gates,
    designSummary,
    quoteText,
    savedAt: (session as { contractor_quote_saved_at?: string | null }).contractor_quote_saved_at ?? null,
    mapImageUrl,
  };

  try {
    const buffer = await renderToBuffer(<QuotePdfDocument data={pdfData} />);
    const companyName = contractor?.company_name ?? 'Your Contractor';
    const cc = (leadRecipient?.email?.trim() ||
      (contractor as { quote_notification_email?: string | null })?.quote_notification_email?.trim() ||
      (contractor as { email?: string | null })?.email?.trim()) ?? undefined;

    const resend = new Resend(resendKey);
    const from = process.env.EMAIL_FROM || 'quotes@quotemyfence.com';

    const { error } = await resend.emails.send({
      from,
      to: customer.email,
      cc: cc ? [cc] : undefined,
      subject: `Your fence quote — ${companyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 22px; color: #1e3a5f;">Your fence quote is ready</h1>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi ${customer.first_name},</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Please find your detailed fence quote attached. We've included your property layout, line measurements, and full pricing breakdown.</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">If you have any questions or would like to proceed, simply reply to this email.</p>
          <p style="margin-top: 32px; color: #64748b; font-size: 14px;">— ${companyName}</p>
        </div>
      `,
      attachments: [
        {
          filename: `quote-${customer.first_name}-${sessionId.slice(0, 8)}.pdf`,
          content: buffer,
        },
      ],
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Send quote email error:', e);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
