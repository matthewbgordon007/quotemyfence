'use client';

import { createClient } from '@/lib/supabase/client';
import { MAX_CONTRACTOR_IMAGE_BYTES } from '@/lib/upload-limits';

function pickExtAndMime(file: File): { ext: string; contentType: string } {
  const raw = (file.name.split('.').pop() || '').toLowerCase();
  const norm = raw === 'jpeg' ? 'jpg' : raw;
  const allowed = new Set(['jpg', 'png', 'webp', 'gif', 'heic', 'heif']);
  if (norm && allowed.has(norm)) {
    const ct: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    return { ext: norm, contentType: ct[norm] || 'image/jpeg' };
  }
  const t = (file.type || '').toLowerCase().trim();
  if (t === 'image/jpeg' || t === 'image/jpg' || t === 'image/pjpeg') return { ext: 'jpg', contentType: 'image/jpeg' };
  if (t === 'image/png') return { ext: 'png', contentType: 'image/png' };
  if (t === 'image/webp') return { ext: 'webp', contentType: 'image/webp' };
  if (t === 'image/gif') return { ext: 'gif', contentType: 'image/gif' };
  if (t === 'image/heic' || t === 'image/heif') return { ext: 'heic', contentType: t };
  if (t === 'public.jpeg') return { ext: 'jpg', contentType: 'image/jpeg' };
  if (t === 'public.png') return { ext: 'png', contentType: 'image/png' };
  if (t === 'public.heic' || t === 'public.heif') return { ext: 'heic', contentType: 'image/heic' };
  return { ext: 'jpg', contentType: 'image/jpeg' };
}

/**
 * Upload to Supabase Storage from the browser (session + RLS).
 * Avoids Next.js/Vercel multipart limits that often break iOS Safari / iPad photo picker.
 */
export async function uploadContractorAssetClient(
  file: File,
  typePrefix: 'style' | 'colour' | 'logo' | 'team'
): Promise<{ url: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Not signed in. Refresh the page and try again.' };
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('contractor_id')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  if (userError || !userRow?.contractor_id) {
    return { error: 'Could not load your contractor account.' };
  }

  if (!file.size) {
    return { error: 'No file selected.' };
  }

  if (file.size > MAX_CONTRACTOR_IMAGE_BYTES) {
    return { error: 'File too large. Max 15MB.' };
  }

  const { ext, contentType } = pickExtAndMime(file);
  const path = `${userRow.contractor_id}/${typePrefix}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('contractor-assets').upload(path, file, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    const msg = uploadError.message || 'Upload failed.';
    if (msg.includes('Bucket') || msg.includes('not found')) {
      return { error: 'Storage is not set up. Ask support to enable the contractor-assets bucket.' };
    }
    return { error: msg };
  }

  const { data: pub } = supabase.storage.from('contractor-assets').getPublicUrl(path);
  if (!pub?.publicUrl) {
    return { error: 'Upload finished but the public URL could not be created.' };
  }

  return { url: pub.publicUrl };
}
