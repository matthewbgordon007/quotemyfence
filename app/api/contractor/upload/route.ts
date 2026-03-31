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
  const t = (file.type || '').toLowerCase();
  if (t && MIME_TO_EXT[t]) {
    ext = MIME_TO_EXT[t];
    return { ext, contentType: t === 'image/jpg' ? 'image/jpeg' : t };
  }
  return null;
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

    const inferred = inferExtensionAndMime(file);
    if (!inferred) {
      return NextResponse.json(
        {
          error:
            'Could not detect image type. Use a clear filename (.jpg, .png, …) or pick a file your browser sends as an image.',
        },
        { status: 400 }
      );
    }
    const { ext, contentType } = inferred;

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
