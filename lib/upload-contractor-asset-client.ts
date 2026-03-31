'use client';

import { createClient } from '@/lib/supabase/client';
import { MAX_CONTRACTOR_IMAGE_BYTES } from '@/lib/upload-limits';

const OPTIMIZE_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const OPTIMIZE_MAX_DIMENSION = 2000;
const OPTIMIZE_QUALITY = 0.82;

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

function renameWithExt(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return `${base || 'upload'}.${ext}`;
}

async function optimizeImageForUpload(file: File): Promise<File> {
  const type = (file.type || '').toLowerCase().trim();
  if (!OPTIMIZE_IMAGE_TYPES.has(type)) return file;
  if (file.size < 300 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = Math.max(bitmap.width, bitmap.height);
    const scale = maxSide > OPTIMIZE_MAX_DIMENSION ? OPTIMIZE_MAX_DIMENSION / maxSide : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', OPTIMIZE_QUALITY)
    );
    if (!blob) return file;
    if (blob.size >= file.size * 0.95) return file;

    return new File([blob], renameWithExt(file.name, 'webp'), {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
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

  const preparedFile = await optimizeImageForUpload(file);

  if (preparedFile.size > MAX_CONTRACTOR_IMAGE_BYTES) {
    const mb = Math.round(MAX_CONTRACTOR_IMAGE_BYTES / (1024 * 1024));
    return { error: `File too large. Max ${mb}MB.` };
  }

  const { ext, contentType } = pickExtAndMime(preparedFile);
  const path = `${userRow.contractor_id}/${typePrefix}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('contractor-assets').upload(path, preparedFile, {
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
