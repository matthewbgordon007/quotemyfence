import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizePvcFenceMaterialProfile,
  type PvcFenceMaterialProfileV1,
} from '@/lib/pvc-fence-material';

async function getCtx(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ur } = await supabase
    .from('users')
    .select('contractor_id, role')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();
  if (!ur?.contractor_id) return null;
  return { contractorId: ur.contractor_id, role: ur.role ?? null };
}

export async function GET() {
  const supabase = await createClient();
  const ctx = await getCtx(supabase);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row, error } = await supabase
    .from('contractors')
    .select('pvc_fence_material_profile')
    .eq('id', ctx.contractorId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const raw = row?.pvc_fence_material_profile as unknown;
  const profile = normalizePvcFenceMaterialProfile(raw);
  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const ctx = await getCtx(supabase);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(ctx.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { profile?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const profile: PvcFenceMaterialProfileV1 = normalizePvcFenceMaterialProfile(body.profile ?? {});

  const { error } = await supabase
    .from('contractors')
    .update({ pvc_fence_material_profile: profile })
    .eq('id', ctx.contractorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile });
}
