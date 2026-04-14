import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  buildFenceStaticMapUrl,
  canBuildFenceStaticMap,
  normalizeFenceMapSegments,
  type FenceMapSegment,
} from '@/lib/static-map-url';

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Satellite map + per-line lengths for quote submission emails */
function fenceLayoutEmailSection(
  mapImageUrl: string | null,
  segments: FenceMapSegment[],
  sectionStyle: string,
  headingStyle: string,
  tdStyle: string,
  linkStyle: string
): string {
  if (!mapImageUrl && segments.length === 0) return '';

  const mapPart = mapImageUrl
    ? `
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">Yellow line = fence path. Small numbered pins mark Line 1, Line 2, and so on—same order as the line lengths below (lines 10+ show as A, B, C…).</p>
            <img src="${escapeHtmlAttr(mapImageUrl)}" alt="Fence layout on map" width="560" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; display: block;" />
            <p style="margin: 12px 0 0 0; font-size: 13px;"><a href="${escapeHtmlAttr(mapImageUrl)}" style="${linkStyle}">Open layout map in browser</a> if the image doesn&apos;t load.</p>
          `
    : segments.length > 0
      ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">Map preview isn&apos;t available; line lengths are listed below.</p>`
      : '';

  const linesRows =
    segments.length > 0
      ? segments
          .map((seg, i) => {
            const len =
              seg.length_ft != null && Number.isFinite(Number(seg.length_ft))
                ? `${Number(seg.length_ft).toFixed(1)} ft`
                : '—';
            return `<tr><td style="${tdStyle}"><strong>Line ${i + 1}</strong></td><td style="${tdStyle}">${len}</td></tr>`;
          })
          .join('')
      : '';

  const tablePart =
    linesRows.length > 0
      ? `<table style="border-collapse: collapse; width: 100%; margin-top: 16px;" cellpadding="0" cellspacing="0"><tbody>${linesRows}</tbody></table>`
      : '';

  return `
            <div style="${sectionStyle}">
              <h2 style="${headingStyle}">Fence layout</h2>
              ${mapPart}
              ${tablePart}
            </div>
          `;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDesignSummary(
  supabase: any,
  fence: { selected_colour_option_id?: string | null; selected_product_option_id?: string | null } | null
): Promise<string> {
  try {
  if (!fence) return '(Not selected)';
  if (fence.selected_colour_option_id) {
    const colId = fence.selected_colour_option_id;
    const { data: colour } = await supabase
      .from('colour_options')
      .select('color_name, fence_style_id')
      .eq('id', colId)
      .single();
    const colourRow = colour as { color_name: string; fence_style_id: string } | null;
    if (colourRow) {
      const { data: style } = await supabase
        .from('fence_styles')
        .select('style_name, fence_type_id')
        .eq('id', colourRow.fence_style_id)
        .single();
      const styleRow = style as { style_name: string; fence_type_id: string } | null;
      if (styleRow) {
        const { data: ft } = await supabase
          .from('fence_types')
          .select('name, standard_height_ft')
          .eq('id', styleRow.fence_type_id)
          .single();
        const ftRow = ft as { name: string; standard_height_ft: number | null } | null;
        if (ftRow) {
          const parts = [
            ftRow.standard_height_ft != null && `${ftRow.standard_height_ft} ft`,
            ftRow.name,
            styleRow.style_name,
            colourRow.color_name,
          ].filter(Boolean);
          return parts.join(' • ') || '(Not selected)';
        }
      }
    }
  }
  if (fence.selected_product_option_id) {
    const optId = fence.selected_product_option_id;
    const { data: opt } = await supabase
      .from('product_options')
      .select('height_ft, color, style_name, product_id')
      .eq('id', optId)
      .single();
    const optRow = opt as { height_ft: number | null; color: string | null; style_name: string | null; product_id: string } | null;
    if (optRow) {
      const { data: prod } = await supabase.from('products').select('name').eq('id', optRow.product_id).single();
      const prodRow = prod as { name: string } | null;
      const parts = [
        optRow.height_ft && `${optRow.height_ft} ft`,
        prodRow?.name,
        optRow.style_name,
        optRow.color,
      ].filter(Boolean);
      return parts.join(' • ') || '(Not selected)';
    }
  }
  return '(Not selected)';
  } catch {
    return '(Not selected)';
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: session, error: sessionError } = await supabase
      .from('quote_sessions')
      .select('contractor_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const [
      { data: customer },
      { data: property },
      { data: fences },
      { data: totals },
      { data: contractor },
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('quote_session_id', sessionId).single(),
      supabase.from('properties').select('*').eq('quote_session_id', sessionId).single(),
      supabase.from('fences').select('*').eq('quote_session_id', sessionId),
      supabase.from('quote_totals').select('*').eq('quote_session_id', sessionId).single(),
      supabase.from('contractors').select('*').eq('id', session.contractor_id).single(),
    ]);

    if (!customer || !contractor) {
      return NextResponse.json({ error: 'Missing customer or contractor' }, { status: 400 });
    }

    const fence = fences?.[0] ?? null;
    let gates: { gate_type: string; quantity: number }[] = [];
    let segments: FenceMapSegment[] = [];
    if (fence) {
      const [{ data: gateRows }, { data: segRows }] = await Promise.all([
        supabase.from('gates').select('gate_type, quantity').eq('fence_id', fence.id),
        supabase
          .from('fence_segments')
          .select('start_lat, start_lng, end_lat, end_lng, length_ft')
          .eq('fence_id', fence.id)
          .order('sort_order'),
      ]);
      gates = gateRows ?? [];
      segments = normalizeFenceMapSegments(segRows ?? []);
    }

    const [
      { data: salesTeam },
      { data: leadRecipient },
    ] = await Promise.all([
      supabase
        .from('sales_team_members')
        .select('name, title, phone, email')
        .eq('contractor_id', session.contractor_id)
        .eq('is_visible', true)
        .order('display_order', { ascending: true })
        .limit(1),
      supabase
        .from('sales_team_members')
        .select('name, email')
        .eq('contractor_id', session.contractor_id)
        .eq('receives_leads', true)
        .maybeSingle(),
    ]);
    const headSales = salesTeam?.[0] ?? null;

    await supabase
      .from('quote_sessions')
      .update({
        status: 'submitted',
        current_step: 'complete',
        completed_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    const rangeText = totals
      ? `$${Number(totals.total_low).toFixed(2)} – $${Number(totals.total_high).toFixed(2)} (before tax)`
      : '(Not calculated)';
    const address = property?.formatted_address ?? '(not provided)';
    const designSummary = await getDesignSummary(supabase, fence);
    const gatesText =
      gates.length > 0
        ? gates.map((g) => `${g.quantity}× ${g.gate_type} gate`).join(', ')
        : 'None';

    const contractorTo =
      (leadRecipient?.email?.trim()) ||
      (contractor as { quote_notification_email?: string | null }).quote_notification_email?.trim() ||
      contractor.email;
    const customerReplyTo =
      typeof contractorTo === 'string' && contractorTo.includes('@') ? contractorTo : undefined;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const mapImageUrl =
      apiKey && canBuildFenceStaticMap(segments) ? buildFenceStaticMapUrl(segments, apiKey) : null;
    const layoutSectionHtml = fenceLayoutEmailSection(
      mapImageUrl,
      segments,
      'padding: 24px 0; border-top: 1px solid #e5e7eb;',
      'font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #111;',
      'padding: 12px 16px; border-bottom: 1px solid #e5e7eb;',
      'color: #2563eb; text-decoration: none;'
    );

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const from = process.env.EMAIL_FROM || 'quotes@quotemyfence.com';

      const tableStyle = 'border-collapse: collapse; width: 100%; max-width: 560px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333; background: #fff;';
      const thStyle = 'text-align: left; padding: 12px 16px; font-weight: 600; color: #111; border-bottom: 1px solid #e5e7eb; background: #f9fafb;';
      const tdStyle = 'padding: 12px 16px; border-bottom: 1px solid #e5e7eb;';
      const linkStyle = 'color: #2563eb; text-decoration: none;';
      const sectionStyle = 'padding: 24px 0; border-top: 1px solid #e5e7eb;';
      const headingStyle = 'font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #111;';

      // Email to contractor: full quote details
      await resend.emails.send({
        from,
        to: contractorTo,
        subject: `New quote submitted — ${address} (${customer.first_name} ${customer.last_name})`,
        html: `
          <div style="${tableStyle} margin: 0 auto; padding: 32px 24px;">
            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #111;">New quote submitted</h1>
            <p style="margin: 0 0 24px 0; color: #6b7280;">A customer has submitted a quote request. A member of your sales team should follow up shortly.</p>

            <div style="${sectionStyle}">
              <h2 style="${headingStyle}">Customer</h2>
              <table style="${tableStyle}" cellpadding="0" cellspacing="0"><tbody>
                <tr><th style="${thStyle}" colspan="2">Contact</th></tr>
                <tr><td style="${tdStyle}"><strong>Name</strong></td><td style="${tdStyle}">${customer.first_name} ${customer.last_name}</td></tr>
                <tr><td style="${tdStyle}"><strong>Email</strong></td><td style="${tdStyle}"><a href="mailto:${customer.email}" style="${linkStyle}">${customer.email}</a></td></tr>
                <tr><td style="${tdStyle}"><strong>Phone</strong></td><td style="${tdStyle}">${customer.phone || '(not provided)'}</td></tr>
                <tr><td style="${tdStyle}"><strong>Lead source</strong></td><td style="${tdStyle}">${customer.lead_source || '(not provided)'}</td></tr>
              </tbody></table>
            </div>

            <div style="${sectionStyle}">
              <h2 style="${headingStyle}">Property & fence</h2>
              <table style="${tableStyle}" cellpadding="0" cellspacing="0"><tbody>
                <tr><td style="${tdStyle}"><strong>Address</strong></td><td style="${tdStyle}">${address}</td></tr>
                <tr><td style="${tdStyle}"><strong>Total length</strong></td><td style="${tdStyle}">${fence?.total_length_ft ?? 0} ft</td></tr>
                <tr><td style="${tdStyle}"><strong>Design</strong></td><td style="${tdStyle}">${designSummary}</td></tr>
                <tr><td style="${tdStyle}"><strong>Gates</strong></td><td style="${tdStyle}">${gatesText}</td></tr>
                <tr><td style="${tdStyle}"><strong>Removal</strong></td><td style="${tdStyle}">${fence?.has_removal ? 'Yes' : 'No'}</td></tr>
              </tbody></table>
            </div>

            ${layoutSectionHtml}

            <div style="${sectionStyle}">
              <h2 style="${headingStyle}">Pricing</h2>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111;">${rangeText}</p>
            </div>

            <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px;">— ${contractor.company_name}</p>
          </div>
        `,
      });

      const salesContactHtml = headSales
        ? `
            <div style="margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #111;">Your point of contact</p>
              <p style="margin: 0 0 4px 0;"><strong>${headSales.name}</strong>${headSales.title ? ` — ${headSales.title}` : ''}</p>
              ${headSales.phone ? `<p style="margin: 0 0 4px 0;"><a href="tel:${headSales.phone}" style="${linkStyle}">${headSales.phone}</a></p>` : ''}
              ${headSales.email ? `<p style="margin: 0;"><a href="mailto:${headSales.email}" style="${linkStyle}">${headSales.email}</a></p>` : ''}
            </div>
          `
        : '';

      // Email to customer: confirmation + sales team contact (reply goes to contractor)
      await resend.emails.send({
        from,
        to: customer.email,
        ...(customerReplyTo ? { replyTo: customerReplyTo } : {}),
        subject: `Your quote request was received — ${contractor.company_name}`,
        html: `
          <div style="${tableStyle} margin: 0 auto; padding: 32px 24px;">
            <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #111;">Thank you for your quote request</h1>
            <p style="margin: 0 0 16px 0;">Hi ${customer.first_name},</p>
            <p style="margin: 0 0 24px 0;">We've received your quote request. A member of our sales team will reach out to you shortly.</p>
            ${salesContactHtml}
            <div style="${sectionStyle}">
              <h2 style="${headingStyle}">Your quote summary</h2>
              <table style="${tableStyle}" cellpadding="0" cellspacing="0"><tbody>
                <tr><td style="${tdStyle}"><strong>Address</strong></td><td style="${tdStyle}">${address}</td></tr>
                <tr><td style="${tdStyle}"><strong>Fence length</strong></td><td style="${tdStyle}">${fence?.total_length_ft ?? 0} ft</td></tr>
                <tr><td style="${tdStyle}"><strong>Design</strong></td><td style="${tdStyle}">${designSummary}</td></tr>
                <tr><td style="${tdStyle}"><strong>Estimated range</strong></td><td style="${tdStyle}">${rangeText}</td></tr>
              </tbody></table>
            </div>
            ${layoutSectionHtml}
            <p style="margin: 24px 0 0 0; color: #6b7280;">If you have any questions in the meantime, feel free to reply to this email.</p>
            <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 14px;">— ${contractor.company_name}</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('submit error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
