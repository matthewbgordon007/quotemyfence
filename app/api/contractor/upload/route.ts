import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

/** Stay under typical serverless request body limits (e.g. Vercel ~4.5MB). */
const MAX_BYTES = 4 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/heif-sequence': 'heif',
  // iOS / Safari sometimes report UTTypes as "public.*" (especially from Photos)
  'public.jpeg': 'jpg',
  'public.png': 'png',
  'public.heic': 'heic',
  'public.heif': 'heif',
  'public.gif': 'gif',
  'public.webp': 'webp',
};

const EXT_NORMALIZE: Record<string, string> = {
  jpeg: 'jpg',
  jpg: 'jpg',
};

function inferExtensionAndMime(file: File): { ext: string; contentType: string } | null {
  const raw = (file.name.split('.').pop() || '').toLowerCase();
  let ext = EXT_NORMALIZE[raw] || raw;
  const allowed = ['jpg', 'png', 'webp', 'gif', 'heic', 'heif'];
  if (ext && allowed.includes(ext)) {
    const mimeByExt: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    return { ext, contentType: mimeByExt[ext] || 'image/jpeg' };
  }
  const t = (file.type || '').toLowerCase().trim();
  if (t && MIME_TO_EXT[t]) {
    ext = MIME_TO_EXT[t];
    const mimeByExt: Record<string, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    return { ext, contentType: mimeByExt[ext] || 'image/jpeg' };
  }
  return null;
}

/** First 32 bytes — JPEG (FF D8), PNG, GIF, WebP (RIFF…WEBP), HEIC/ISO BMFF (ftyp at offset 4). */
async function sniffMagicBytes(file: File): Promise<{ ext: string; contentType: string } | null> {
  try {
    const slice = file.slice(0, 32);
    const buf = await slice.arrayBuffer();
    const u8 = new Uint8Array(buf);
    if (u8.length < 3) return null;
    if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
      return { ext: 'jpg', contentType: 'image/jpeg' };
    }
    if (u8.length >= 4 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
      return { ext: 'png', contentType: 'image/png' };
    }
    if (u8.length >= 4 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x38) {
      return { ext: 'gif', contentType: 'image/gif' };
    }
    if (
      u8.length >= 12 &&
      u8[0] === 0x52 &&
      u8[1] === 0x49 &&
      u8[2] === 0x46 &&
      u8[3] === 0x46 &&
      u8[8] === 0x57 &&
      u8[9] === 0x45 &&
      u8[10] === 0x42 &&
      u8[11] === 0x50
    ) {
      return { ext: 'webp', contentType: 'image/webp' };
    }
    if (u8.length >= 12 && u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) {
      return { ext: 'heic', contentType: 'image/heic' };
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveImageType(file: File): Promise<{ ext: string; contentType: string }> {
  const fromMeta = inferExtensionAndMime(file);
  if (fromMeta) return fromMeta;

  const sniffed = await sniffMagicBytes(file);
  if (sniffed) return sniffed;

  return { ext: 'jpg', contentType: 'image/jpeg' };
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('upload: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server misconfiguration: Supabase credentials are missing.' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('contractor_id')
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .single();

    if (!userRow?.contractor_id) {
      return NextResponse.json(
        { error: 'Contractor account not found' },
        { status: 403 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formErr) {
      console.error('formData parse error:', formErr);
      const errMsg = formErr instanceof Error ? formErr.message : String(formErr);
      return NextResponse.json(
        {
          error:
            errMsg.includes('body') || errMsg.includes('size')
              ? 'File too large. Try an image under 4MB.'
              : 'Could not parse upload. Try a smaller image (under 4MB).',
        },
        { status: 400 }
      );
    }
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'logo';

    if (!file || !file.size) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const isPdf =
      (file.name.split('.').pop() || '').toLowerCase() === 'pdf' || file.type === 'application/pdf';
    if (isPdf) {
      return NextResponse.json(
        { error: 'Product photos must be images (JPG, PNG, WebP, GIF or HEIC). PDFs are not supported.' },
        { status: 400 }
      );
    }

    const { ext, contentType } = await resolveImageType(file);

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Max 4MB (server limit).' },
        { status: 400 }
      );
    }

    // Node/serverless: upload bytes instead of File (avoids stream/type quirks with some runtimes).
    const bytes = await file.arrayBuffer();

    const path = `${userRow.contractor_id}/${type}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('contractor-assets')
      .upload(path, bytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('upload error:', uploadError);
      const msg =
        uploadError.message?.includes('Bucket') || uploadError.message?.includes('not found')
          ? 'Storage bucket not found. Run supabase/storage.sql in the Supabase SQL editor.'
          : uploadError.message || 'Upload failed. Try again.';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Use our path for the public URL (SDK upload payload shape can vary by version).
    const { data: urlData } = supabaseAdmin.storage.from('contractor-assets').getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl, path });
  } catch (e) {
    console.error('upload error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
