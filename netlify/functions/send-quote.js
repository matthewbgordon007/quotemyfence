// netlify/functions/send-quote.js
// Sends 2 emails via SendGrid:
// 1) To contractor email (looked up by slug via Supabase service role)
// 2) Confirmation to homeowner email

const sgMail = require("@sendgrid/mail");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");

    const {
      contractorSlug,
      contractorName,
      customerName,
      customerEmail,
      customerPhone,
      address,
      fenceType,
      fenceColor,
      estimateLow,
      estimateHigh,
      totalFeet,
      lines, // [{id, feet, shared, sharedWith}]
      screenshotDataUrl, // "data:image/png;base64,...."
      notes
    } = body;

    // Basic validation
    if (!contractorSlug) return { statusCode: 400, body: "Missing contractorSlug" };
    if (!customerName || !customerEmail) return { statusCode: 400, body: "Missing customer info" };
    if (!address) return { statusCode: 400, body: "Missing address" };

    // Env
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SEND_FROM = process.env.SEND_FROM; // e.g. "quotes@quotemyfence.ca"
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SENDGRID_API_KEY || !SEND_FROM || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, body: "Missing server configuration env vars" };
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    // Look up contractor email by slug (server-side, not exposed to browser)
    const contractorEmail = await lookupContractorEmail({
      supabaseUrl: SUPABASE_URL,
      serviceKey: SUPABASE_SERVICE_ROLE_KEY,
      slug: contractorSlug
    });

    if (!contractorEmail) {
      return { statusCode: 404, body: "Contractor not found / missing email" };
    }

    // Build text summary
    const linesText = Array.isArray(lines) && lines.length
      ? lines.map((l) => {
          const sharedTxt = l.shared
            ? `Shared 50% with ${l.sharedWith || "Neighbour"}`
            : "Private";
          return `• Line ${l.id}: ${Number(l.feet || 0).toFixed(1)} ft — ${sharedTxt}`;
        }).join("\n")
      : "• (No lines provided)";

    const rangeText =
      (Number.isFinite(estimateLow) && Number.isFinite(estimateHigh))
        ? `$${Number(estimateLow).toFixed(2)} – $${Number(estimateHigh).toFixed(2)} (before tax)`
        : "(Estimate not available)";

    const subject = `Quote Request — ${address} (${fenceType}${fenceColor ? " / " + fenceColor : ""})`;

    const contractorMsgText =
`New Quote Request

Customer:
- Name: ${customerName}
- Email: ${customerEmail}
- Phone: ${customerPhone || "(not provided)"}

Project:
- Address: ${address}
- Fence Type: ${fenceType || "(not selected)"}
- Colour: ${fenceColor || "(none)"}
- Total Length: ${Number(totalFeet || 0).toFixed(1)} ft
- Estimated Range: ${rangeText}

Lines:
${linesText}

Notes:
${notes || "(none)"}

Sent via QuoteMyFence`;

    const customerMsgText =
`We’ve sent your request to the contractor.

Summary:
- Address: ${address}
- Fence Type: ${fenceType || "(not selected)"}
- Colour: ${fenceColor || "(none)"}
- Total Length: ${Number(totalFeet || 0).toFixed(1)} ft
- Estimated Range: ${rangeText}

The contractor will follow up with an official quote.

— QuoteMyFence`;

    // Optional attachment from screenshot data URL
    const attachments = [];
    if (typeof screenshotDataUrl === "string" && screenshotDataUrl.startsWith("data:image/")) {
      const base64 = screenshotDataUrl.split(",")[1] || "";
      // Limit attachment size ~3MB base64 (rough)
      if (base64.length > 4_000_000) {
        // Too big, skip attachment instead of failing
      } else {
        attachments.push({
          content: base64,
          filename: "map.png",
          type: "image/png",
          disposition: "attachment"
        });
      }
    }

    // 1) Contractor email
    await sgMail.send({
      to: contractorEmail,
      from: SEND_FROM,
      subject,
      text: contractorMsgText,
      attachments
    });

    // 2) Homeowner confirmation email
    await sgMail.send({
      to: customerEmail,
      from: SEND_FROM,
      subject: "We received your quote request",
      text: customerMsgText
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("send-quote error:", err);
    return { statusCode: 500, body: "Server error" };
  }
};

// Server-side lookup using Supabase REST with service role key
async function lookupContractorEmail({ supabaseUrl, serviceKey, slug }) {
  const url = `${supabaseUrl}/rest/v1/contractors?select=email,quote_email,slug&slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = rows && rows[0];
  // Prefer quote_email if you add it; fall back to email
  return row?.quote_email || row?.email || null;
}