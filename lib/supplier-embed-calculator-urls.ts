/**
 * Normalize supplier-pasted URLs into iframe-safe embed URLs.
 * Only https URLs on an allowlist are returned.
 */

export type EmbedUrlResult = { ok: true; embedUrl: string } | { ok: false; error: string };

const GOOGLE_SHEETS_PATH = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

function isHttpsUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

/** Turn a Sheets browser URL into a minimal-chrome embed (still requires sheet sharing for viewers). */
export function buildGoogleSheetsEmbedUrl(pasted: string): EmbedUrlResult {
  const u = isHttpsUrl(pasted);
  if (!u) return { ok: false, error: 'Paste a full https:// link from Google Sheets.' };
  if (u.hostname !== 'docs.google.com') {
    return { ok: false, error: 'Use a link that starts with https://docs.google.com/spreadsheets/…' };
  }
  const m = u.pathname.match(GOOGLE_SHEETS_PATH);
  if (!m) return { ok: false, error: 'Could not read the spreadsheet ID from that link.' };
  const id = m[1];
  const embedUrl = `https://docs.google.com/spreadsheets/d/${id}/edit?rm=minimal&widget=true&headers=false`;
  return { ok: true, embedUrl };
}

/** Accept Office embed URLs as pasted (OneDrive embed, SharePoint embed, or Office viewer). */
export function sanitizeExcelOfficeEmbedUrl(pasted: string): EmbedUrlResult {
  const u = isHttpsUrl(pasted);
  if (!u) return { ok: false, error: 'Paste a full https:// embed link from Excel / OneDrive / SharePoint.' };

  const host = u.hostname.toLowerCase();
  const allowed =
    host === 'view.officeapps.live.com' || host === 'onedrive.live.com' || host.endsWith('.sharepoint.com');

  if (!allowed) {
    return {
      ok: false,
      error:
        'Use an embed URL from Microsoft: OneDrive “Embed”, SharePoint “Embed”, or a view.officeapps.live.com link. Short 1drv.ms links must be opened once in the browser, then copy the long embed URL.',
    };
  }

  return { ok: true, embedUrl: u.toString() };
}
