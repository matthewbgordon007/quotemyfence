import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { getSupplierContractorSession } from '@/lib/supplier-auth-helpers';
import { normalizeMaterialListJson } from '@/lib/material-quote-lines';
import { MATERIAL_QUOTE_REQUEST_SELECT } from '@/lib/supplier-material-quote-request-fields';
import { enrichMaterialQuoteRequests } from '@/lib/supplier-material-quote-requests-enrich';

const ALLOWED_STATUS = new Set(['pending', 'quoted', 'closed']);

const SELECT_FIELDS = MATERIAL_QUOTE_REQUEST_SELECT;

function siteBaseUrl() {
  const trim = (u: string) => u.replace(/\/$/, '');
  if (process.env.NEXT_PUBLIC_SITE_URL) return trim(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.NEXT_PUBLIC_APP_URL) return trim(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) {
    const v = process.env.VERCEL_URL;
    return v.startsWith('http') ? trim(v) : trim(`https://${v}`);
  }
  return 'https://quotemyfence.ca';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error } = await supabase
    .from('material_quote_requests')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .eq('supplier_contractor_id', sess.contractorId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [request] = await enrichMaterialQuoteRequests(supabase, [row]);
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ request });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sess = await getSupplierContractorSession(supabase);
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supplier_response =
    body.supplier_response !== undefined ? String(body.supplier_response).trim() || null : undefined;
  const status = body.status !== undefined ? String(body.status).trim() : undefined;
  let supplier_material_list_json: unknown | undefined;
  if (body.supplier_material_list_json !== undefined) {
    if (body.supplier_material_list_json === null) {
      supplier_material_list_json = null;
    } else if (!Array.isArray(body.supplier_material_list_json)) {
      return NextResponse.json({ error: 'supplier_material_list_json must be an array or null' }, { status: 400 });
    } else {
      supplier_material_list_json = normalizeMaterialListJson(body.supplier_material_list_json) ?? [];
    }
  }

  if (status !== undefined && !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (supplier_response === undefined && status === undefined && supplier_material_list_json === undefined) {
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  }

  const { data: prev, error: prevErr } = await supabase
    .from('material_quote_requests')
    .select('id, status, contractor_id, quote_session_id, supplier_quoted_emailed_at')
    .eq('id', id)
    .eq('supplier_contractor_id', sess.contractorId)
    .maybeSingle();

  if (prevErr) return NextResponse.json({ error: prevErr.message }, { status: 500 });
  if (!prev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (supplier_response !== undefined) updates.supplier_response = supplier_response;
  if (status !== undefined) updates.status = status;
  if (supplier_material_list_json !== undefined) updates.supplier_material_list_json = supplier_material_list_json;

  const { data: row, error } = await supabase
    .from('material_quote_requests')
    .update(updates)
    .eq('id', id)
    .eq('supplier_contractor_id', sess.contractorId)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const nextStatus = (status ?? (prev as { status: string }).status) as string;
  const shouldEmailContractor =
    nextStatus === 'quoted' &&
    !(prev as { supplier_quoted_emailed_at?: string | null }).supplier_quoted_emailed_at &&
    process.env.RESEND_API_KEY;

  if (shouldEmailContractor) {
    try {
      const contractorId = (prev as { contractor_id: string }).contractor_id;
      const quoteSessionId = (prev as { quote_session_id: string | null }).quote_session_id;
      const { data: afterRow } = await supabase
        .from('material_quote_requests')
        .select('supplier_response, supplier_material_list_json')
        .eq('id', id)
        .single();
      const responseText = (afterRow as { supplier_response?: string | null })?.supplier_response?.trim() || '';
      const listRows = normalizeMaterialListJson(
        (afterRow as { supplier_material_list_json?: unknown })?.supplier_material_list_json
      );

      const [{ data: contractor }, { data: cust }] = await Promise.all([
        supabase
          .from('contractors')
          .select('company_name, email, quote_notification_email')
          .eq('id', contractorId)
          .single(),
        quoteSessionId
          ? supabase.from('customers').select('id').eq('quote_session_id', quoteSessionId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const toEmail =
        (contractor as { quote_notification_email?: string | null })?.quote_notification_email ||
        (contractor as { email?: string | null })?.email;
      const base = siteBaseUrl();
      const calcUrl = `${base}/dashboard/calculator?material_quote_id=${encodeURIComponent(id)}`;
      const customerId = cust?.id as string | undefined;
      const customerUrl = customerId ? `${base}/dashboard/customers/${encodeURIComponent(customerId)}` : `${base}/dashboard`;

      if (toEmail) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.EMAIL_FROM || 'quotes@quotemyfence.com';
        const linesHtml =
          listRows && listRows.length > 0
            ? `<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-size:14px;"><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Unit $</th><th>Line $</th></tr>${listRows
                .map(
                  (row) =>
                    `<tr><td>${escapeHtml(row.description || '')}</td><td>${row.qty ?? ''}</td><td>${escapeHtml(row.unit || '')}</td><td>${row.unitPrice ?? ''}</td><td>${row.lineTotal ?? ''}</td></tr>`
                )
                .join('')}</table>`
            : '';
        await resend.emails.send({
          from,
          to: [toEmail],
          subject: `Material quote ready — ${(contractor as { company_name?: string })?.company_name || 'QuoteMyFence'}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height:1.5;">
              <h2>Your supplier has updated your material request</h2>
              <p>Status: <strong>Quoted</strong></p>
              ${
                responseText
                  ? `<p><strong>Supplier notes:</strong></p><p>${escapeHtml(String(responseText))}</p>`
                  : ''
              }
              ${linesHtml ? `<p><strong>Material list</strong></p>${linesHtml}` : ''}
              <p><a href="${calcUrl}">Open job in your calculator</a> (uses your linked supplier’s contractor material rates when available).</p>
              <p><a href="${customerUrl}">Open customer record</a></p>
            </div>
          `,
        });
        await supabase
          .from('material_quote_requests')
          .update({ supplier_quoted_emailed_at: new Date().toISOString() })
          .eq('id', id)
          .eq('supplier_contractor_id', sess.contractorId);
      }
    } catch {
      /* email is best-effort */
    }
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
