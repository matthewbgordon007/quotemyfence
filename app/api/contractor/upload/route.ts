import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
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
        { error: errMsg.includes('body') || errMsg.includes('size') ? 'File too large. Try an image under 4MB.' : 'Could not parse upload. Try a smaller image (under 4MB).' },
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

    // Use extension as source of truth (server FormData can have empty/inconsistent file.type)
    const ext = (file.name.split('.').pop() || '').toLowerCase() || 'png';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const isPdf = ext === 'pdf' || file.type === 'application/pdf';
    if (isPdf) {
      return NextResponse.json(
        { error: 'Product photos must be images (JPG, PNG, WebP or GIF). PDFs are not supported.' },
        { status: 400 }
      );
    }
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type. Use JPG, PNG, WebP or GIF (got .${ext || 'unknown'}).` },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max 5MB.' },
        { status: 400 }
      );
    }

    const path = `${userRow.contractor_id}/${type}-${Date.now()}.${ext}`;

    const { data: upload, error: uploadError } = await supabaseAdmin.storage
      .from('contractor-assets')
      .upload(path, file, {
        contentType: file.type,
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

    const { data: urlData } = supabaseAdmin.storage
      .from('contractor-assets')
      .getPublicUrl(upload.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error('upload error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
