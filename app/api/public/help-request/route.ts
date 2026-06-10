import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.trim() : '';
    const quoteSessionId =
      typeof body.quoteSessionId === 'string' && body.quoteSessionId.trim()
        ? body.quoteSessionId.trim()
        : null;

    if (!message) {
      return NextResponse.json({ error: 'Please describe what went wrong.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email so we can reach you.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Best-effort: tie the request to the contractor behind this quote session.
    let contractorId: string | null = null;
    if (quoteSessionId) {
      const { data: session } = await supabase
        .from('quote_sessions')
        .select('contractor_id')
        .eq('id', quoteSessionId)
        .maybeSingle();
      contractorId = (session as { contractor_id: string | null } | null)?.contractor_id ?? null;
    }

    const { error: insertError } = await supabase.from('help_requests').insert({
      quote_session_id: quoteSessionId,
      contractor_id: contractorId,
      name: name || null,
      email,
      phone: phone || null,
      message,
      page_url: pageUrl || null,
    });

    if (insertError) {
      // help_requests table not created yet (migration not run).
      if (/help_requests/.test(insertError.message || '')) {
        return NextResponse.json(
          { error: 'Help requests aren\u2019t set up yet. Please contact us directly.' },
          { status: 503 }
        );
      }
      console.error('help-request insert error:', insertError);
      return NextResponse.json({ error: 'Could not save your message. Please try again.' }, { status: 500 });
    }

    // Notify the master admin(s) by email if Resend is configured.
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const { data: admins } = await supabase.from('master_admins').select('email');
        const to = (admins ?? [])
          .map((a) => (a as { email: string | null }).email)
          .filter((e): e is string => typeof e === 'string' && e.includes('@'));
        if (to.length > 0) {
          const resend = new Resend(resendKey);
          const from = process.env.EMAIL_FROM || 'quotes@quotemyfence.com';
          await resend.emails.send({
            from,
            to,
            ...(email ? { replyTo: email } : {}),
            subject: `New help request from ${name || email}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333; max-width: 560px;">
                <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px 0; color: #111;">New help request</h1>
                <p style="margin: 0 0 4px 0;"><strong>From:</strong> ${escapeHtml(name || '(no name)')}</p>
                <p style="margin: 0 0 4px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
                ${phone ? `<p style="margin: 0 0 4px 0;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
                ${pageUrl ? `<p style="margin: 0 0 4px 0;"><strong>Page:</strong> ${escapeHtml(pageUrl)}</p>` : ''}
                <div style="margin: 16px 0; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(message)}</div>
                <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px;">View all help requests in the master admin under "Help requests".</p>
              </div>
            `,
          });
        }
      } catch (e) {
        console.error('help-request email error:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('help-request error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
