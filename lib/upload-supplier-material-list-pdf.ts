import { createClient as createSupabase } from '@supabase/supabase-js';

const MAX_PDF_BYTES = 6 * 1024 * 1024;

/** Upload a supplier material-list PDF to public storage; returns public URL + display name. */
export async function uploadSupplierMaterialListPdf(
  supplierContractorId: string,
  requestId: string,
  pdfBase64: string,
  filename: string
): Promise<{ url: string; name: string } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const bytes = Buffer.from(pdfBase64, 'base64');
  if (bytes.length > MAX_PDF_BYTES) return null;

  const admin = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'material-list.pdf';
  const path = `${supplierContractorId}/material-quote-pdfs/${requestId}/${Date.now()}-${cleanName}`;

  const { error } = await admin.storage.from('contractor-assets').upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) return null;

  const { data } = admin.storage.from('contractor-assets').getPublicUrl(path);
  return { url: data.publicUrl, name: filename || cleanName };
}
